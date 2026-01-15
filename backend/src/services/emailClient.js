const Imap = require('imap');
const { simpleParser } = require('mailparser');
const emailConfig = require('../config/email');

class EmailClient {
    constructor() {
        this.imap = null;
    }

    // Connect to IMAP server
    connect() {
        return new Promise((resolve, reject) => {
            this.imap = new Imap(emailConfig);

            this.imap.once('ready', () => {
                console.log('✅ Connected to email server');
                // Keepalive heartbeat every 30 seconds
                this.keepalive = setInterval(() => {
                    if (this.imap && this.imap.state === 'authenticated') {
                        try {
                            this.imap.noop(() => { }); // Simple keepalive
                        } catch (err) {
                            // Ignore noop errors (connection may be closing)
                        }
                    }
                }, 30000);
                resolve();
            });

            this.imap.once('error', (err) => {
                console.error('❌ IMAP connection error:', err);
                reject(err);
            });

            this.imap.on('error', (err) => {
                console.error('⚠️ IMAP error (after ready):', err.message);
                if (err.message.includes('ECONNRESET') || err.message.includes('closed')) {
                    if (this.imap) this.imap.state = 'disconnected';
                }
            });

            this.imap.once('end', () => {
                console.log('📧 IMAP connection ended');
                if (this.keepalive) clearInterval(this.keepalive);
            });

            this.imap.connect();
        });
    }

    // Disconnect from IMAP server
    disconnect() {
        if (this.keepalive) {
            clearInterval(this.keepalive);
            this.keepalive = null;
        }
        if (this.imap) {
            this.imap.end();
            this.imap = null;
        }
    }

    // Fetch unread emails
    async fetchUnreadEmails(limit = 100) {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) return reject(err);

                // Filter since yesterday to avoid 83k emails
                const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const imapDate = `${yesterday.getDate()}-${months[yesterday.getMonth()]}-${yesterday.getFullYear()}`;

                console.log(`🔍 Searching since ${imapDate}...`);
                this.imap.search(['UNSEEN', ['SINCE', imapDate]], (err, results) => {
                    if (err) return reject(err);

                    if (!results || results.length === 0) {
                        console.log('📭 No unread emails');
                        return resolve([]);
                    }

                    const limitedResults = results.sort((a, b) => b - a).slice(0, limit);
                    console.log(`📬 Processing ${limitedResults.length} newest unread emails...`);

                    const emails = [];
                    if (limitedResults.length === 0) return resolve([]);

                    const fetch = this.imap.fetch(limitedResults, { bodies: '', struct: true });

                    let processed = 0;
                    const total = limitedResults.length;

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';
                        let attrs = null;

                        msg.on('body', (stream) => {
                            stream.on('data', (chunk) => buffer += chunk.toString('utf8'));
                        });

                        msg.once('attributes', (a) => attrs = a);

                        msg.once('end', async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                emails.push({
                                    uid: attrs.uid,
                                    messageId: parsed.messageId,
                                    from: parsed.from?.text || 'Unknown',
                                    fromEmail: parsed.from?.value?.[0]?.address || '',
                                    subject: parsed.subject || '(No subject)',
                                    text: parsed.text || '',
                                    html: parsed.html || '',
                                    date: parsed.date || new Date()
                                });
                            } catch (e) {
                                console.error('Error parsing email:', e.message);
                            } finally {
                                processed++;
                                if (processed === total) {
                                    resolve(emails);
                                }
                            }
                        });
                    });

                    fetch.once('error', (err) => {
                        console.error('Fetch error:', err);
                        if (emails.length > 0) resolve(emails);
                        else reject(err);
                    });

                    fetch.once('end', () => {
                        // Fallback in case msg 'end' events don't finish
                        setTimeout(() => {
                            if (processed < total) resolve(emails);
                        }, 2000);
                    });
                });
            });
        });
    }

    /**
     * Find the trash folder name
     */
    async findTrashFolder() {
        return new Promise((resolve) => {
            this.imap.getBoxes((err, boxes) => {
                if (err) return resolve('Trash'); // Default

                const candidates = [];
                const scan = (obj, prefix = '') => {
                    for (const name in obj) {
                        const fullName = prefix + name;
                        const attribs = (obj[name].attribs || []).map(a => a.toLowerCase());

                        // Check attributes first (best way)
                        if (attribs.includes('\\trash')) return fullName;
                        if (attribs.includes('\\junk')) candidates.push({ name: fullName, priority: 2 });

                        // Check name keywords
                        const lower = name.toLowerCase();
                        if (lower === 'trash' || lower === 'corbeille' || lower.includes('deleted')) return fullName;
                        if (lower.includes('indésirable') || lower.includes('spam')) candidates.push({ name: fullName, priority: 1 });

                        if (obj[name].children) {
                            const result = scan(obj[name].children, fullName + obj[name].delimiter);
                            if (result) return result;
                        }
                    }
                };

                const bestAttr = scan(boxes);
                if (bestAttr) return resolve(bestAttr);

                if (candidates.length > 0) {
                    candidates.sort((a, b) => b.priority - a.priority);
                    return resolve(candidates[0].name);
                }

                resolve('Trash'); // Fallback
            });
        });
    }

    // Delete multiple emails permanently (using UIDs)
    async deleteMultiple(uids) {
        if (!uids || uids.length === 0) {
            console.log('ℹ️  No emails to delete');
            return { success: true, count: 0 };
        }

        return new Promise((resolve, reject) => {
            if (!this.imap) {
                console.error('❌ IMAP connection lost - reconnecting...');
                return this.connect()
                    .then(() => this.deleteMultiple(uids))
                    .then(resolve)
                    .catch(reject);
            }

            this.imap.openBox('INBOX', false, (err) => {
                if (err) {
                    console.error('❌ Failed to open INBOX for deletion:', err.message);
                    return reject(new Error(`Failed to open INBOX: ${err.message}`));
                }

                console.log(`🗑️  Permanently deleting ${uids.length} emails from INBOX...`);

                // Direct deletion: FLAG as deleted + EXPUNGE
                this.imap.addFlags(uids, '\\Deleted', (flagErr) => {
                    if (flagErr) {
                        console.error('❌ Failed to flag emails for deletion:', flagErr.message);
                        return reject(new Error(`Failed to delete emails: ${flagErr.message}`));
                    }

                    console.log(`✅ Flagged ${uids.length} emails as \\Deleted`);

                    this.imap.expunge((expungeErr) => {
                        if (expungeErr) {
                            console.error('❌ Expunge failed:', expungeErr.message);
                            return reject(new Error(`Failed to expunge: ${expungeErr.message}`));
                        }
                        console.log(`✨ ${uids.length} emails permanently deleted from INBOX`);
                        resolve({ success: true, count: uids.length, method: 'direct-delete' });
                    });
                });
            });
        });
    }

    // Mark multiple emails as read (using UIDs)
    async markMultipleAsRead(uids) {
        if (!uids || uids.length === 0) return;
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err) => {
                if (err) return reject(err);

                console.log(`✅ Marking ${uids.length} emails as read...`);
                this.imap.addFlags(uids, '\\Seen', (err) => {
                    if (err) {
                        console.error('❌ Failed to mark as read:', err.message);
                        return reject(err);
                    }
                    console.log('✅ UIDs marked as read');
                    resolve();
                });
            });
        });
    }
}

module.exports = EmailClient;
