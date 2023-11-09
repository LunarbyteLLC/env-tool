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
}

function sendMail(to: string, from: string) {
    // send the mail
}