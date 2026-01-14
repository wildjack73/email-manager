const EmailClient = require('./emailClient');
const { classifyEmail } = require('./claudeAI');
const { pool } = require('../config/database');

// Load protected domains from environment
const PROTECTED_DOMAINS = (process.env.PROTECTED_DOMAINS || '')
    .split(',')
    .map(d => d.trim())
    .filter(d => d.length > 0);

/**
 * Check if email is already processed
 */
async function isEmailProcessed(messageId) {
    const result = await pool.query(
        'SELECT id FROM processed_emails WHERE message_id = $1',
        [messageId]
    );
    return result.rows.length > 0;
}

/**
 * Check if email domain is in whitelist
 */
async function isWhitelisted(fromEmail) {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    const result = await pool.query(
        "SELECT id FROM whitelist WHERE LOWER($1) LIKE '%' || LOWER(domain) || '%'",
        [domain]
    );

    return result.rows.length > 0;
}

/**
 * Check if email is from a protected domain (safety rule)
 */
function isProtectedDomain(fromEmail) {
    const domain = fromEmail.toLowerCase();
    for (const protectedDomain of PROTECTED_DOMAINS) {
        if (domain.includes(protectedDomain.toLowerCase())) return true;
    }
    const protectedPatterns = ['notaire', 'avocat', 'huissier', 'tribunal', 'administration', 'fiscal'];
    for (const pattern of protectedPatterns) {
        if (domain.includes(pattern)) return true;
    }
    return false;
}

/**
 * Check if email contains banned keywords
 */
async function containsBannedKeywords(subject, text) {
    const result = await pool.query('SELECT keyword, case_sensitive FROM keywords');
    const keywords = result.rows;
    for (const row of keywords) {
        const keyword = row.keyword;
        const case_sensitive = row.case_sensitive === 1;
        const searchText = case_sensitive ? subject + ' ' + text : (subject + ' ' + text).toLowerCase();
        const searchKeyword = case_sensitive ? keyword : keyword.toLowerCase();
        if (searchText.includes(searchKeyword)) return { found: true, keyword };
    }
    return { found: false };
}

/**
 * Save processed email to database
 */
async function saveProcessedEmail(email, classification, reasoning, action) {
    await pool.query(
        `INSERT INTO processed_emails 
     (message_id, from_email, subject, classification, claude_reasoning, action_taken) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [email.messageId, email.fromEmail, email.subject, classification, reasoning, action]
    );
}

/**
 * Main classifier function
 */
async function processEmails() {
    const emailClient = new EmailClient();
    try {
        console.log('🚀 Starting email classification process (v3 - Robust Batch)...');

        // Phase 1: Fetch
        await emailClient.connect();
        const emails = await emailClient.fetchUnreadEmails(200);
        emailClient.disconnect();

        if (emails.length === 0) {
            console.log('✅ No new emails to process');
            return { processed: 0, deleted: 0, kept: 0 };
        }

        const toDelete = [];
        const toMarkRead = [];
        let processed = 0;
        let deleted = 0;
        let kept = 0;

        // Phase 2: Classify (Offline)
        for (const email of emails) {
            console.log(`\n📧 Classifying: ${email.subject} from ${email.fromEmail}`);

            if (await isEmailProcessed(email.messageId)) {
                console.log('⏭️  Already processed, skipping');
                continue;
            }

            // Rules
            if (await isWhitelisted(email.fromEmail)) {
                console.log('✅ Whitelisted - KEEPING');
                toMarkRead.push(email.uid);
                await saveProcessedEmail(email, 'IMPORTANT', 'Whitelisted domain', 'KEPT');
                kept++;
                processed++;
                continue;
            }

            if (isProtectedDomain(email.fromEmail)) {
                console.log('🔒 Protected - KEEPING');
                toMarkRead.push(email.uid);
                await saveProcessedEmail(email, 'IMPORTANT', 'Protected domain', 'KEPT');
                kept++;
                processed++;
                continue;
            }

            const keywordCheck = await containsBannedKeywords(email.subject, email.text || '');
            if (keywordCheck.found) {
                console.log(`🚫 Banned keyword "${keywordCheck.keyword}" - DELETING`);
                toDelete.push(email.uid);
                await saveProcessedEmail(email, 'SPAM', `Contains banned keyword: ${keywordCheck.keyword}`, 'DELETED');
                deleted++;
                processed++;
                continue;
            }

            // AI
            const { classification, reasoning } = await classifyEmail(email);
            const action = (classification === 'SPAM' || classification === 'INUTILE') ? 'DELETED' : 'KEPT';
            await saveProcessedEmail(email, classification, reasoning, action);

            if (action === 'DELETED') {
                console.log(`🗑️  Classified as ${classification} - DELETING`);
                toDelete.push(email.uid);
                deleted++;
            } else {
                console.log(`✅ Classified as IMPORTANT - KEEPING`);
                toMarkRead.push(email.uid);
                kept++;
            }
            processed++;
        }

        // Phase 3: Apply actions
        if (toDelete.length > 0 || toMarkRead.length > 0) {
            console.log(`\n📦 Applying actions to ${toDelete.length + toMarkRead.length} emails...`);
            await emailClient.connect();
            if (toDelete.length > 0) await emailClient.deleteMultiple(toDelete);
            if (toMarkRead.length > 0) await emailClient.markMultipleAsRead(toMarkRead);
            emailClient.disconnect();
        }

        console.log(`\n✅ Summary: ${processed} processed, ${deleted} deleted, ${kept} kept`);
        return { processed, deleted, kept };

    } catch (error) {
        console.error('❌ Fatal error:', error);
        emailClient.disconnect();
        throw error;
    }
}

module.exports = { processEmails };
