/*
    This app is an example for initializing the system.
    It references some env variables that can be used to bootstrap an environment file.
 */

import process from "process";

function doStuff() {

    const apiKey = process.env.MY_API_KEY!;

    if (process.env.ENABLE_MAIL_SEND){
        sendMail('recipient@example.com', process.env.FROM_EMAIL!);
    }

    // danger: undocumented but required variable

    const encryptionKey = process.env.ENCRYPTION_KEY!;
    if (! encryptionKey) {
        throw new Error('Ahhhh somebody didnt set an encryption key');
    }
}

function sendMail(to: string, from: string) {
    // send the mail
}