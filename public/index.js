const ws = new WebSocket(`ws://${window.document.location.host}`);

// Log socket opening and closing
ws.addEventListener("open", event => {
    console.log("Websocket connection opened");
});

ws.addEventListener("close", event => {
    console.log("Websocket connection closed");
});

ws.onmessage = function (message) {
    /* What we expect to receive
    {
        "user": "Little Bobby Tables",
        "action": "send_message",
        "msg": "Have a nice day!"
    }
    */
    const msg = JSON.parse(message.data);
    //If/Else for downloading files
    //      ^^^^^^^^^^^^
    /*if (message.data instanceof Blob) {
        reader = new FileReader();
        reader.onload = () => {
            msgDiv.innerHTML = reader.result;
            document.getElementById('messages').appendChild(msgDiv);
        };
        reader.readAsText(message.data);
    } else {*/
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msgCtn');
    msgDiv.innerHTML = `${msg.user} said "${msg.msg}\"`;
    document.getElementById('messages').appendChild(msgDiv);
    //}
}
/* {
    "msg_typ": "msg",
    "msg": "Who",
    "lang_from": "en",
    "langs_to": ["es", "fj"],
    //"receivers: ["bob", "salley"], //or ["all"]
    "translations": ["", ""]
}   */
const form = document.getElementById('msgForm');

form.addEventListener('submit', (event) => {
    event.preventDefault(); //Prevents page refresh
    const message = document.getElementById('inputBox').value;
    const msg = {
        "msg_typ": message,
        "msg": "Who",
        "lang_from": "en",
        "translations": {}
    }  
    ws.send(JSON.stringify(msg));
    document.getElementById('inputBox').value = ''
})

function login(){
    //send login message
    const user = document.getElementById("username").value;
    document.getElementById("username").readonly = "readonly";
    const lang = document.getElementById("lang").value;
    document.getElementById("lang").readonly = "readonly";
    const msg = {
        "msg_type": "login",
        "lang": lang,
        "user": user
    };
    ws.send(JSON.stringify(msg));
}