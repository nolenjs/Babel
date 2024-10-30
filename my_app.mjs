import { createServer } from 'http';
import staticHandler from 'serve-handler';
import {v4 as uuidv4 } from 'uuid';
import ws, { WebSocketServer } from 'ws';
var port = process.argv[2] || 8080;

//serve static folder
const server = createServer((req, res) => {   // (1)
    return staticHandler(req, res, { public: 'public' });
});
const wss = new WebSocketServer({ server }); // (2)
var connectionInfo = { };
/* 
{
    "msg_typ": "msg",
    "msg": "Whp next",
    "lang_from": "en",
    "langs_to": ["", ""],
    "translations": ["", ""]
}
{
    "msg_type": "login",
    "user": "",
    "lang": "en"
}    
*/

wss.on('connection', (client) => {
    console.log(`Client connected ${JSON.stringify(client)}!`)
    // const clientIP = client._socket.remoteAddress;
    // const clientPort = client._socket.remotePort;
    const clientUUID = uuidv4();
    client._socket._uuid = clientUUID;

    client.on('message', (msg) => {    // (3)
        console.log(`Message:${msg}`);
        var msgData = JSON.parse(msg);
        if (msgData.msg_type == "login"){
            connectionInfo[clientUUID] = msgData;
            broadcast(JSON.stringify({user: msgData.user, action: "login"}));
        }
        else if (msgData.msg_type == "msg"){
            //translate into language
            const msg = msgData.msg;
            const og_lang = msgData.lang_from;
            msgData.translations[og_lang] = msg;
            
            msgData.langs_to.forEach(async (langCode) => {
                const response = await fetch("*api-link", {
                    method: "POST",
                    body: JSON.stringify({"q": msg, "target": langCode})
                });
                // const respData = awat response.json();
                const translatedMessage = response.json.body.translations[0].translatedText;
                msgData.translations[langCode] = translatedMessage;
            })
            broadcast(JSON.stringify(msgData));
        }
    });
});

function broadcast(msgData) {       // (4)
    for (const client of wss.clients) {
        console.log(`Broadcasting: ${JSON.stringify(client)}`);
        console.log(`Broadcasting to socket: ${JSON.stringify(client._socket)}`);
        if (client.readyState === ws.OPEN) {
            let respObj;
            if (msgData.msg_type == "msg"){
                let userInfo = connectionInfo[client._socket._uuid]
                let langCode = userInfo.lang;
                console.log(msgData)
                const translated = msgData.translations[langCode]
                respObj = {user: userInfo.user, action: "send_message", msg: translated}
                // client.send(JSON.stringify({user: userInfo.user, action: "send_message", msg: translated}));
            }
            else if (msgData.msg_type == "login"){
                respObj = {user: msgData.user, action: "login"}
                // client.send(JSON.stringify({user: msgData.user, action: "login"}));
            }

            console.log(respObj)
            client.send(JSON.stringify(respObj))
        }
    }
}
server.listen(port, () => {
    console.log(`server listening...${port}`);
})