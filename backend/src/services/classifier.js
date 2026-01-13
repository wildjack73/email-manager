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

    // Check against environment protected domains
    for (const protectedDomain of PROTECTED_DOMAINS) {
        if (domain.includes(protectedDomain.toLowerCase())) {
            return true;
        }
    }

    // Additional safety patterns
    const protectedPatterns = [
        'notaire',
        'avocat',
        'huissier',
        'tribunal',
        'administration',
        'fiscal'
    ];

    for (const pattern of protectedPatterns) {
        if (domain.includes(pattern)) {
            return true;
        }
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

        if (searchText.includes(searchKeyword)) {
            return { found: true, keyword };
        }
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
        console.log('🚀 Starting email classification process...');

        // Connect to email server
        await emailClient.connect();

        // Fetch unread emails
        const emails = await emailClient.fetchUnreadEmails();

        if (emails.length === 0) {
            console.log('✅ No emails to process');
            emailClient.disconnect();
            return { processed: 0, deleted: 0, kept: 0 };
        }

        let processed = 0;
        let deleted = 0;
        let kept = 0;

        for (const email of emails) {
            try {
                console.log(`\n📧 Processing: ${email.subject} from ${email.fromEmail}`);

                // Check if already processed (avoid duplicates)
                if (await isEmailProcessed(email.messageId)) {
                    console.log('⏭️  Already processed, skipping');
                    continue;
                }

                // 1. Check whitelist first (highest priority)
                if (await isWhitelisted(email.fromEmail)) {
                    console.log('✅ Whitelisted domain - KEEPING');
                    await emailClient.markAsRead(email.uid);
                    await saveProcessedEmail(email, 'IMPORTANT', 'Whitelisted domain', 'KEPT');
                    kept++;
                    processed++;
                    continue;
                }

                // 2. Check protected domains (safety rule)
                if (isProtectedDomain(email.fromEmail)) {
                    console.log('🔒 Protected domain (.gouv.fr, bank, etc.) - KEEPING');
                    await emailClient.markAsRead(email.uid);
                    await saveProcessedEmail(email, 'IMPORTANT', 'Protected domain (safety rule)', 'KEPT');
                    kept++;
                    processed++;
                    continue;
                }

                // 3. Check banned keywords
                const keywordCheck = await containsBannedKeywords(email.subject, email.text);
                if (keywordCheck.found) {
                    console.log(`🚫 Banned keyword "${keywordCheck.keyword}" detected - DELETING`);
                    await emailClient.moveToTrash(email.uid);
                    await saveProcessedEmail(email, 'SPAM', `Contains banned keyword: ${keywordCheck.keyword}`, 'DELETED');
                    deleted++;
                    processed++;
                    continue;
                }

                // 4. Use Claude AI to classify
                const { classification, reasoning } = await classifyEmail(email);

                // 5. Save result to database FIRST (so it appears in dashboard even if deletion fails)
                const action = (classification === 'SPAM' || classification === 'INUTILE') ? 'DELETED' : 'KEPT';
                await saveProcessedEmail(email, classification, reasoning, action);

                // 6. Take action based on classification
                if (action === 'DELETED') {
                    console.log(`🗑️  Classified as ${classification} - DELETING`);
                    try {
                        // Robust access to UID functions
                        const uidHandler = emailClient.imap.uid || emailClient.imap;
                        const uid = email.uid; // Assuming email.uid is available here

                        if (typeof uidHandler.addFlags !== 'function') {
                            throw new Error('IMAP server or client does not support addFlags');
                        }

                        await new Promise((resolve, reject) => {
                            uidHandler.addFlags(uid, '\\Deleted', (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                // Expunge only the deleted UID
                                const expungeHandler = emailClient.imap.uid || emailClient.imap;
                                expungeHandler.expunge(uid, (err) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    console.log(`🗑️  Email UID ${uid} permanently deleted from INBOX`);
                                    resolve();
                                });
                            });
                        });
                    } catch (err) {
                        console.error(`⚠️ Failed to move email ${email.uid} to trash:`, err.message);
                    }
                    deleted++;
                } else {
                    console.log(`✅ Classified as IMPORTANT - KEEPING`);
                    try {
                        await emailClient.markAsRead(email.uid);
                    } catch (err) {
                        console.error(`⚠️ Failed to mark email ${email.uid} as read:`, err.message);
                    }
                    kept++;
                }

                processed++;

            } catch (emailError) {
                const errorMessage = emailError.message || 'Unknown error';
                console.error(`❌ Error processing email ${email.messageId}:`, errorMessage);

                // In case of error, keep the email but CLEARLY mark it as an ERROR in the reasoning
                try {
                    await emailClient.markAsRead(email.uid);
                    await saveProcessedEmail(email, 'IMPORTANT', `ERREUR IA: ${errorMessage}`, 'KEPT');
                    kept++;
                } catch (saveError) {
                    console.error('Failed to save error state:', saveError);
                }
            }
        }

        emailClient.disconnect();

        console.log(`\n✅ Classification complete: ${processed} processed, ${deleted} deleted, ${kept} kept`);
        return { processed, deleted, kept };

    } catch (error) {
        console.error('❌ Fatal error in email processing:', error);
        emailClient.disconnect();
        throw error;
    }
}

module.exports = { processEmails };
