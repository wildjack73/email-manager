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
                        this.imap.noop(() => { }); // Simple keepalive
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

    // Move multiple emails to trash (using UIDs)
    async deleteMultiple(uids) {
        if (!uids || uids.length === 0) return;
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err) => {
                if (err) return reject(err);

                console.log(`🗑️  Flagging ${uids.length} emails for deletion...`);
                this.imap.uid.addFlags(uids, '\\Deleted', (err) => {
                    if (err) {
                        console.error('❌ Failed to add Deleted flag:', err.message);
                        return reject(err);
                    }

                    console.log('🧹 Expunging deleted emails...');
                    this.imap.expunge((expungeErr) => {
                        if (expungeErr) {
                            console.warn('⚠️ Expunge failed, but flags were set:', expungeErr.message);
                            // We resolve anyway because the flags are set
                        } else {
                            console.log('✨ Inbox expunged successfully');
                        }
                        resolve();
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
                this.imap.uid.addFlags(uids, '\\Seen', (err) => {
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
