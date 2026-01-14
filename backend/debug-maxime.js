const Imap = require('imap');
const emailConfig = require('./src/config/email');

const imap = new Imap(emailConfig);

imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
        if (err) throw err;

        const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const imapDate = `${yesterday.getDate()}-${months[yesterday.getMonth()]}-${yesterday.getFullYear()}`;

        console.log(`🔍 Searching for Maxime Armengaud since ${imapDate}...`);
        imap.search([['SINCE', imapDate], ['HEADER', 'FROM', 'maxime.armengaud@pennylane.com']], (err, results) => {
            if (err) throw err;

            if (results.length === 0) {
                console.log('❌ Email NOT found in INBOX (last 48h).');
                imap.end();
                return;
            }

            console.log(`✅ Found ${results.length} email(s) in INBOX.`);
            const fetch = imap.fetch(results, { bodies: '', struct: true });

            fetch.on('message', (msg) => {
                msg.once('attributes', (attrs) => {
                    console.log(`[UID: ${attrs.uid}] Flags: ${attrs.flags.join(', ')}`);
                });
            });

            fetch.once('end', () => {
                console.log('\n--- ATTEMPTING FORCE DELETE ---');
                // Use a single UID list
                imap.uid.addFlags(results, '\\Deleted', (err) => {
                    if (err) console.error('Error adding flags:', err);
                    else console.log('✅ Flags added');

                    imap.expunge((err) => {
                        if (err) console.error('Error expunging:', err);
                        else console.log('✅ Expunge complete');
                        imap.end();
                    });
                });
            });
        });
    });
});

imap.once('error', err => console.error('IMAP Error:', err));
imap.connect();
