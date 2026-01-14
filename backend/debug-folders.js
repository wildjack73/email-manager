const Imap = require('imap');
const emailConfig = require('./src/config/email');

const imap = new Imap(emailConfig);

imap.once('ready', () => {
    imap.getBoxes((err, boxes) => {
        if (err) throw err;
        const scan = (b, p = '') => {
            for (const k in b) {
                const full = p + k;
                const attribs = b[k].attribs.map(a => a.toLowerCase());
                if (attribs.includes('\\trash') || attribs.includes('\\junk') || attribs.includes('\\spam')) {
                    console.log('--- SPECIAL FOLDER FOUND ---');
                    console.log('Name:', full);
                    console.log('Attribs:', b[k].attribs.join(', '));
                }
                if (objLook(full)) console.log('Folder:', full, 'Attribs:', b[k].attribs.join(', '));
                if (b[k].children) scan(b[k].children, full + b[k].delimiter);
            }
        };
        const objLook = (name) => {
            const n = name.toLowerCase();
            return n.includes('trash') || n.includes('corbeille') || n.includes('junk') || n.includes('spam');
        };
        scan(boxes);
        imap.end();
    });
});

imap.once('error', err => console.error(err));
imap.connect();
