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
                // Remove the connection error listener to avoid double handling rejection
                this.imap.removeAllListeners('error');
                // Add a permanent error listener to prevent crashes on future errors
                this.imap.on('error', (err) => {
                    console.error('❌ IMAP Connection Error:', err.message);
                });
                resolve();
            });

            this.imap.once('error', (err) => {
                console.error('❌ IMAP connection error (initial):', err);
                reject(err);
            });

            this.imap.once('end', () => {
                console.log('📧 IMAP connection ended');
            });

            this.imap.connect();
        });
    }

    // Disconnect from IMAP server
    disconnect() {
        if (this.imap) {
            this.imap.end();
        }
    }

    // Fetch unread emails
    async fetchUnreadEmails(limit = 200) {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Search for UNSEEN (unread) emails
                this.imap.search(['UNSEEN'], (err, results) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!results || results.length === 0) {
                        console.log('📭 No unread emails found');
                        resolve([]);
                        return;
                    }

                    // Get newest emails first and limit count
                    const limitedResults = results.sort((a, b) => b - a).slice(0, limit);
                    console.log(`📬 Found ${results.length} unread. Checking newest ${limitedResults.length}...`);

                    const emails = [];
                    const fetch = this.imap.fetch(limitedResults, {
                        bodies: '',
                        struct: true,
                        markSeen: false
                    });

                    let messagesToProcess = limitedResults.length;
                    let processedCount = 0;

                    const checkDone = () => {
                        processedCount++;
                        if (processedCount === messagesToProcess) {
                            console.log(`✨ Filtering complete. ${emails.length} emails match criteria.`);
                            resolve(emails);
                        }
                    };

                    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';
                        let attrs = null;

                        msg.on('body', (stream, info) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('attributes', (a) => {
                            attrs = a;
                        });

                        msg.once('end', async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                const emailDate = parsed.date || new Date();

                                // Only keep emails from the last 30 minutes
                                if (emailDate >= thirtyMinutesAgo) {
                                    emails.push({
                                        uid: attrs.uid,
                                        messageId: parsed.messageId,
                                        from: parsed.from?.text || 'Unknown',
                                        fromEmail: parsed.from?.value?.[0]?.address || '',
                                        subject: parsed.subject || '(No subject)',
                                        text: parsed.text || '',
                                        html: parsed.html || '',
                                        date: emailDate
                                    });
                                }
                            } catch (parseErr) {
                                console.error('Error parsing individual email:', parseErr);
                            } finally {
                                checkDone();
                            }
                        });
                    });

                    fetch.once('error', (err) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        // If no messages were actually fetched (rare but safer)
                        if (messagesToProcess === 0) resolve([]);
                    });
                });
            });
        });
    }

    // Move email to trash
    // Move email to trash (using UID)
    async moveToTrash(uid) {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Add deleted flag and expunge
                this.imap.uid.addFlags(uid, '\\Deleted', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    this.imap.uid.expunge(uid, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        console.log(`🗑️  Email UID ${uid} permanently deleted from INBOX`);
                        resolve();
                    });
                });
            });
        });
    }

    // Mark email as read (using UID)
    async markAsRead(uid) {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.imap.uid.addFlags(uid, '\\Seen', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log(`✅ Email UID ${uid} marked as read`);
                    resolve();
                });
            });
        });
    }
}

module.exports = EmailClient;
