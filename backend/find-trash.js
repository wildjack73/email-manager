const Imap = require('imap');
const emailConfig = require('./src/config/email');

const imap = new Imap(emailConfig);

imap.once('ready', () => {
    imap.getBoxes((err, boxes) => {
        if (err) throw err;

        const findTrash = (obj, prefix = '') => {
            for (let name in obj) {
                const fullName = prefix + name;
                const lower = fullName.toLowerCase();
                if (lower.includes('trash') || lower.includes('corbeille') || lower.includes('delete')) {
                    console.log('FOUND TRASH CANDIDATE:', fullName);
                }
                if (obj[name].children) {
                    findTrash(obj[name].children, fullName + obj[name].delimiter);
                }
            }
        };
        findTrash(boxes);
        imap.end();
    });
});

imap.once('error', (err) => {
    console.error(err);
});

imap.connect();
