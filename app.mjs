import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import staticHandler from 'serve-handler';
import ws, { WebSocketServer } from 'ws';
const port = process.argv[2] || 8888;
//serve static folder
const server = createServer((req, res) => {   // (1)
    return staticHandler(req, res, { public: 'public' })
});
const wss = new WebSocketServer({ server }) // (2)
const connectionInfo = { }
let langs_to_translate = ['es', 'fj']

/*
*** Types of msgs ****

** login-type message **
// Sample Requests:
// req 1
{
    "msg_type": "login",
    "lang": "en",
    "user": "Little Bobby Tables"
}

// req 2
{
    "msg_type": "login",
    "lang": "es",
    "user": "Inigo Montoya"
}

// req 3
{
    "msg_type": "login",
    "lang": "fj",
    "user": "Beach Comber"
}

// Sample Response:
// req 1's resp
{
    "user": "Little Bobby Tables",
    "action": "login"
}

// req 2's resp
{
    "user": "Inigo Montoya",
    "action": "login"
}
// req 3's resp
{
    "user": "Beach Comber",
    "action": "login"
}

** Send message  **
// Sample Request
// req 1
{
    "msg_typ": "msg",
    "msg": "Who",
    "lang_from": "en",
    "langs_to": ["es", "fj"],
    "receivers: ["bob", "salley"], //or ["all"]
    "translations": ["", ""]
}   

// Sample Responses
// req 1's resp to Little Bobby Tables
{
    "user": "Little Bobby Tables",
    "action": "send_message",
    "msg": "Have a nice day!"
}

// req 1's resp to Inigo Montoya
{
    "user": "Little Bobby Tables",
    "action": "send_message",
    "msg": "¡Que tenga un lindo día!"
}

// req 1's resp to Beach Comber
{
    "user": "Little Bobby Tables",
    "action": "send_message",
    "msg": "Marautaka na siga!"
}
*/

wss.on('connection', (client) => {
    console.log(`Client connected ${JSON.stringify(client)}!`)
    const clientIpAddr = client._socket.remoteAddress
    const clientPort = client._socket.remotePort
    const clientUuid = uuidv4();
    client._socket._uuid = clientUuid;

    client.on('message', async (msg) => {    // (3)
        console.log(`Received Message: ${msg}`);
        const msgData = JSON.parse(msg);
        if (msgData.msg_type == "login")
        {
            connectionInfo[clientUuid] = msgData;
            if (!langs_to_translate.includes(msgData.lang)){
                langs_to_translate.append(msgData.lang)
            }
        } 
        else if (msgData.msg_type == "msg")
        {
            const msg = msgData.msg;
            const orig_lang = msgData.lang_from;
            msgData.translations[orig_lang] = msg;

            for await (const langCode of langs_to_translate) {
                // translate into lang using google translate
                // todo... translate message into required langs
                // https://translation.googleapis.com/language/translate/v2?key=AIzaSyDdDpwBK_ssJRH9-hqRkhHqzSA0fzg8tvc
                // 
                const response = await fetch("https://translation.googleapis.com/language/translate/v2?key=AIzaSyDdDpwBK_ssJRH9-hqRkhHqzSA0fzg8tvc", {
                    method: "POST",
                    body: JSON.stringify({ "q": msg, "target": langCode }),
                });

                const respData = await response.json();
                console.log(respData.data.translations);
                const tranlatedMessage = respData.data.translations[0].translatedText;
                msgData.translations[langCode] = tranlatedMessage;
            };
        }
            
        broadcast(msgData);
    })
});

function broadcast(msgData) {       // (4)
    for (const client of wss.clients) {
        if (client.readyState === ws.OPEN) {
            let respObj = null; 
            if (msgData.msg_type == "msg")
            {
                const userInfo = connectionInfo[client._socket._uuid];
                const langCode = userInfo.lang;
                const translatedText = msgData.translations[langCode];
                respObj = { user: userInfo.user, action: "send_message", msg: translatedText};
            }
            else // login
            {
                respObj ={ user: msgData.user, action: "login"};
            }

            const respObjJson = JSON.stringify(respObj);
            console.log(`Sending Message: ${respObjJson}`);

            client.send(respObjJson);
        }
    }
}

server.listen(port, () => {
    console.log(`server listening on port ${port}`);
});