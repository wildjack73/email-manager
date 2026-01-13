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
    async fetchUnreadEmails() {
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

                    console.log(`📬 Found ${results.length} unread emails`);

                    const emails = [];
                    const fetch = this.imap.fetch(results, {
                        bodies: '',
                        markSeen: false // Don't mark as read automatically
                    });

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';

                        msg.on('body', (stream, info) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('end', async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                emails.push({
                                    seqno,
                                    messageId: parsed.messageId,
                                    from: parsed.from?.text || 'Unknown',
                                    fromEmail: parsed.from?.value?.[0]?.address || '',
                                    subject: parsed.subject || '(No subject)',
                                    text: parsed.text || '',
                                    html: parsed.html || '',
                                    date: parsed.date
                                });
                            } catch (parseErr) {
                                console.error('Error parsing email:', parseErr);
                            }
                        });
                    });

                    fetch.once('error', (err) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        resolve(emails);
                    });
                });
            });
        });
    }

    // Move email to trash
    async moveToTrash(seqno) {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Add deleted flag
                this.imap.addFlags(seqno, '\\Deleted', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Expunge (permanently delete from INBOX)
                    this.imap.expunge((err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        console.log(`🗑️  Email ${seqno} moved to trash`);
                        resolve();
                    });
                });
            });
        });
    }

    // Mark email as read (keep in inbox)
    async markAsRead(seqno) {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.imap.addFlags(seqno, '\\Seen', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log(`✅ Email ${seqno} marked as read`);
                    resolve();
                });
            });
        });
    }
}

module.exports = EmailClient;
