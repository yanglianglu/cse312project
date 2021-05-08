let socket = undefined;
var button_id = 0;
// Establish a WebSocket connection with the server

//function init() {

// getChatHistory();
socket = new WebSocket('ws://' + window.location.host + '/websocket');
socket.onmessage = addMessage;

// Allow users to send messages by pressing enter instead of clicking the Send button
/*
document.addEventListener("keypress", function (event) {
   if (event.code === "Enter") {
      sendMessage();
   }
}) */



// Read the name/comment the user is sending to chat and send it to the server over the WebSocket as a JSON string
// Called whenever the user clicks the Send button or pressed enter
function sendMessage() {
   console.log("in sendMessage()");
   const chatName = document.getElementById("chat-name").value;
   const chatBox = document.getElementById("chat-comment");
   const comment = chatBox.value;
   chatBox.value = "";
   chatBox.focus();
   if (comment !== "") {
      socket.send(JSON.stringify({ 'username': chatName, 'comment': comment }));
   }
}

// Called when the server sends a new message over the WebSocket and renders that message so the user can read it
function addMessage(message) {
   const chatMessage = JSON.parse(message.data);
   console.log(message)
   //let chat = document.getElementById('chat'); // here is get from the placeholder part at chat
   //chat.innerHTML += "<b>" + chatMessage['username'] + "</b>: " + chatMessage["comment"] + "<br/>";
   if (chatMessage['SenderName'] != null) {
      let chat = document.getElementById('chat');
      console.log('Display Image');
      chat.innerHTML += "<b>" + chatMessage['SenderName'] + "</b>: " + '<h1><img src="' + chatMessage["ImagePath"] + '"width="150" height="150" /><h1/>' + "<br/>";
   }
   else if (chatMessage['onlineusername'] != null) {
      let userlistTag = document.getElementById('userlistTag');
      console.log('Display online user list');
      //userlistTag.innerHTML += "<button id=" + button_id + "onclick='start_chat(this.id)' >" + chatMessage['onlineusername'] + "</button>";
      //button_id += 1;
      //userlistTag.innerHTML += "<button >" + chatMessage['onlineusername'] + "</button>";
      var exist = false;
      var buttons = document.getElementsByTagName('button');
      for (var i = 0; i < buttons.length; i++) {
         if (buttons[i].innerHTML == chatMessage['onlineusername']) {
            exist = true;

         }
      }
      if (!exist) {
         //userlistTag = document.getElementsById(userlistTag);
         userlistTag.innerHTML += "<button id=" + button_id + " onclick='start_chat(this.id)' >" + chatMessage['onlineusername'] + "</button>";
         button_id += 1;
      }
   }
   else if (chatMessage['start_chating'] != null) {//?? what does this send? 
      console.log("in start_chating");
   }
   else { // display text comment
      let chat = document.getElementById('chat');
      console.log('Display Text');
      chat.innerHTML += "<b>" + chatMessage['username'] + "</b>: " + chatMessage["comment"] + "<br/>";
   }

}

function sendImage() {
   console.log("in sendImage()");
   const input = document.querySelector('input[type=file]');
   const SenderName = document.getElementById("Sender-Name").value;

   var SenderNameLen = SenderName.toString().length;
   console.log("SenderNameLen: " + SenderNameLen); //6 jessie ok

   // var uint8array = new TextEncoder().encode(string);
   // var string = new TextDecoder(encoding).decode(uint8array);

   var senderNameLenAB = new Uint8Array(1);
   senderNameLenAB[0] = SenderNameLen;

   var senderNameAB = new TextEncoder().encode(SenderName);
   console.log("senderNameAB lenth is: " + senderNameAB.byteLength); //6
   console.log("senderNameAB is: " + senderNameAB.toString('utf8')); //106,101,115,115,105,101  Decimal value


   var senderNameStr = new TextDecoder().decode(senderNameAB);
   console.log("senderNameStr: " + senderNameStr);//jessie
   console.log("senderNameLenAB len is: " + senderNameLenAB.byteLength);


   var file = input.files[0];
   socket.binaryType = "arraybuffer";
   //ws.binaryData = "blob";
   //Extracting data from a blob https://developer.mozilla.org/en-US/docs/Web/API/Blob
   const reader = new FileReader();

   reader.addEventListener('loadend', () => {
      // reader.result contains the contents of blob as a typed array
      console.log("reader.result type: " + typeof (reader.result));
      var tmp = new Uint8Array(senderNameLenAB.byteLength + senderNameAB.byteLength);
      tmp.set(new Uint8Array(senderNameLenAB), 0);
      tmp.set(new Uint8Array(senderNameAB), senderNameLenAB.byteLength);
      console.log("tmp[0]: " + parseInt(tmp[0].toString(2), 2));//parseInt(tmp[0].toString(2), 2)
      /*var buf1 = Buffer.from(sendFrameArray);
      var buf2 = Buffer.from(SenderName);
      console.log("ArrayBuffer senderName length" + buf2.length);
      var buf3 = Buffer.from(reader.result);
      var list = [buf1, buf2, buf3];
      var newbuff = Buffer.concat(list);
      socket.send(newbuff); */ // can not use Buffer in the browser 

      //socket.send(reader.result);
      var tmp2 = new Uint8Array(tmp.byteLength + reader.result.byteLength);
      tmp2.set(new Uint8Array(tmp), 0);
      tmp2.set(new Uint8Array(reader.result), tmp.byteLength);

      console.log("tmp2 bytelength payload lenth is " + tmp2.byteLength);
      console.log(parseInt(tmp2[0].toString(2), 2));//
      socket.send(tmp2);
      //socket.send(reader.result);
      console.log("the File has been transferred.")
   });

   //readAsArrayBuffer()	The result is a JavaScript ArrayBuffer containing binary data.
   //https://developer.mozilla.org/en-US/docs/Web/API/FileReader/results
   reader.readAsArrayBuffer(file);


}

function start_chat(id) {
   //let userlistTag = document.getElementById('userlistTag');
   username = document.getElementById(id).innerHTML;
   console.log(username);
   socket.send(JSON.stringify({ 'start_chating': username }));

}

/*
function welcomeAlert(){
   alert("Click the OK BUTTON to show the NYC Top Attractions Pictures!")
   // console.log("in Alert");
}

*/

/**************Hon's edited*****************/
//exports.init = init
//exports.addMessage = addMessage
//exports.sendMessage = sendMessage