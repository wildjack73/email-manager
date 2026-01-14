const Imap = require('imap');
const emailConfig = require('./src/config/email');

const imap = new Imap(emailConfig);

imap.once('ready', () => {
    imap.getBoxes((err, boxes) => {
        if (err) throw err;
        console.log('Top level folders:', Object.keys(boxes).join(', '));
        if (boxes.INBOX && boxes.INBOX.children) {
            console.log('INBOX children:', Object.keys(boxes.INBOX.children).join(', '));
        }
        imap.end();
    });
});

imap.once('error', (err) => {
    console.error(err);
});

imap.connect();
