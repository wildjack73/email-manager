const Imap = require('imap');
const emailConfig = require('./src/config/email');

const imap = new Imap(emailConfig);

imap.once('ready', () => {
    imap.openBox('INBOX', true, (err, box) => {
        if (err) throw err;
        // Search for recent unread emails or match subject
        imap.search(['ALL'], (err, results) => {
            if (err) throw err;
            if (results.length === 0) {
                console.log('BOX EMPTY');
                imap.end();
                return;
            }

            // Get last 20
            const last20 = results.slice(-20);
            const fetch = imap.fetch(last20, { bodies: 'HEADER.FIELDS (SUBJECT)', struct: true });

            fetch.on('message', (msg) => {
                msg.on('body', (stream) => {
                    let h = '';
                    stream.on('data', c => h += c);
                    stream.on('end', () => {
                        const subject = h.split('\r\n').find(l => l.toLowerCase().startsWith('subject:'))?.substring(8).trim() || '';
                        msg.once('attributes', attrs => {
                            console.log(`[UID: ${attrs.uid}] FLAGS: ${attrs.flags.join(',')} SUBJECT: ${subject}`);
                        });
                    });
                });
            });

            fetch.once('end', () => imap.end());
        });
    });
});

imap.once('error', err => console.error(err));
imap.connect();
