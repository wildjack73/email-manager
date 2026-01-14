const Imap = require('imap');
const emailConfig = require('./src/config/email');

const imap = new Imap(emailConfig);

imap.once('ready', () => {
    imap.getBoxes((err, boxes) => {
        if (err) throw err;
        const printBoxes = (obj, prefix = '') => {
            for (let k in obj) {
                console.log(prefix + k);
                if (obj[k].children) {
                    printBoxes(obj[k].children, prefix + k + obj[k].delimiter);
                }
            }
        };
        printBoxes(boxes);
        imap.end();
    });
});

imap.once('error', (err) => {
    console.error(err);
});

imap.connect();
