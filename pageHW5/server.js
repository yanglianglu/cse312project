const net = require('net');
//const ws
console.log("starting the server");
var flag = false;
let staticFiles = new Map([
    ["/style.css", "text/css"],
    ["/image/kitten.jpg", "image/jpeg"],
    ["/image/cat.jpg", "image/jpeg"],
    ["/image/dog.jpg", "image/jpeg"],
    ["/image/eagle.jpg", "image/jpeg"],
    ["/image/flamingo.jpg", "image/jpeg"],
    ["/image/parrot.jpg", "image/jpeg"],
    ["/image/rabbit.jpg", "image/jpeg"],
    ["/image/elephant.jpg", "image/jpeg"],
    ["/functions.js", "text/javascript"],
    ["/utf.txt", "text/plain"],
    ["/NYCImage/9_11_Memorial.jpg", "image/jpeg"],
    ["/NYCImage/Metropolitan_Museum.jpg", "image/jpeg"],
    ["/NYCImage/Central_Park.jpg", "image/jpeg"]
]);
var bcrypt = require('bcryptjs');
//------------------------------------------------------------------
var MongoClient = require('mongodb').MongoClient;
// local mongo database works use below
//var url = "mongodb://localhost:27017/mongo";

/*
Instead of using "localhost"/"127.0.0.1"/"0.0.0.0"
• Use the name of the service
*/
// for docker compose up use below 
var url = "mongodb://mongo:27017/mongo";

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("mongo");// or myDatabase


    //------------------------------------------------------------------
    //var firstReadOfBodyLength = 0; //if put at here,then once got reach the content-length we need to reset to 0 for next image upload tracking cumalating
    //var userMessageMap = new Map();
    var userMessageMapArray = [];
    //const userMessageMapObject = {};
    //var imageCaptionArray = [];
    var imageNameConventionCount = 0;

    //let isWebSocket = new Map();
    let clients = [];
    let clientSocket = [];
    //let chatHistoryArray = [];
    let username_socket = new Map();
    var justSignInUser = '';
    var chating = false;
    var chatingPerson = '';
    net.createServer(function (socket) {
        var imageFormContentLength = 0;
        var ReadOfBodyLength = 0;
        var bufferReadArray = new Uint8Array();
        var bufferLeftRead = 0;
        var imageBoundarySep = '';


        const clientID = socket.remoteAddress + ":" + socket.remotePort;

        //========for WS image buffer============
        var bufferRead = false;
        var bufferPayLoadArray = [];
        var bufferMaskArray = [];
        var bufferPayLoadArrayAfterXOR = [];
        var bufferWholeLen = 0;
        //var isText = false;
        //====================

        //====for continue frame================

        var cumulateFrameArray = [];
        var useCumulateFrameFlag = false;
        //var bufferFrameFlag = false;

        var payLoadLessWholeLen = false;
        //====================
        //var justSignInUser = '';
        socket.on("data", function (data) {
            var isText = false;// everytime get in reset to be false, so it could be image or text
            flag = false;

            console.log("--got data -- \n");


            // hw4 object 1 
            //console.log("*** Start message from: " + socket + '(' + socket.remoteAddress + ") ***");
            console.log("*** Start message from: " + clientID + "***\n");
            //console.log("*** Start message from: "+socket.remoteAddress+" received: \n" + data +" ***"); 
            //console.log(data.toString());

            //console.log(" received: \n" + data.length + " bytes of data");//L16 38:59   for object 3
            //console.log(data.toString());
            //console.log("sample: " + data.slice(0, 1024));
            //console.log("\n --end request --\n\n");

            // var crlfcrlf = Buffer.from("\r\n\r\n", 'utf-8');
            // var crlfcrlfLen = crlfcrlf.length;
            // var headerEndIndex = data.indexOf(crlfcrlf);

            //----if it is websocket connection-------------

            //handle as websocket frame
            if (clients.includes(clientID) == true) {
                // parse payload
                console.log("parsing payload");
                console.log(data.toString());
                var webSocketSendData = Buffer.from(data);
                console.log("receive 1 webframe size " + webSocketSendData.length);


                // for payload <= wholeLen in ==127 check
                // here true mean it goes into ==127 first and <whole lenth, not know read next frame or buffer yet
                // but these two case both need useCumulateFrameFlag cummulate frame array, cuz finBit==0 at the beginning 
                // if (payLoadLessWholeLen == true) {
                //     var opcodePart = webSocketSendData[0];
                //     var opcode = opcodePart & 15; // 1111 =15
                //     console.log("121_new frame opcode: " + opcode);
                //     var finBit = opcodePart & 128; // 1000 0000
                //     console.log("122_finBit: " + finBit);

                //     if (finBit == 128 && opcode == 2) { // here mean it has frame stucture so, need read as frame not buffer
                //         console.log("127 frame not buffer + 126 frame")
                //     }
                //     // buffer does not have this structure, so it will not meet the conditon above if statement 
                //     else {
                //         bufferFrameFlag = true;
                //         bufferRead = true;
                //         console.log("127 frame + buffer + 126 frame");
                //     }

                // }


                //!!first time frame comes not for buffer! And use the multiframe also go in here
                if (bufferRead == false) {

                    var opcodePart = webSocketSendData[0];
                    var opcode = opcodePart & 15; // 1111 =15
                    console.log("new frame opcode: " + opcode);
                    if (opcode == 8){

                    }
                    else{

                    
                    var finBit = opcodePart & 128; // 1000 0000
                    console.log("finBit: " + finBit);


                    var payLoadLen = webSocketSendData[1];

                    payLoadLenInt = parseInt(payLoadLen.toString(2), 2) - 128;
                    console.log("payLoadLenInt: " + payLoadLenInt);

                    var maskArray = new Uint8Array();
                    var payLoadArray = new Uint8Array();
                    var messageArray = [];// is result after payLoadArray XOR 
                    var messageArrayRemove = [];

                    // sending image over >=65536
                    if (payLoadLenInt == 127) { // buffering lecture 43:19
                        console.log("=== 127");
                        console.log("finBit: " + finBit);// second frame also 128

                        //next 64 bits which 8 byte are payLoadLen
                        var fourBytePayLoadLen = webSocketSendData.slice(2, 10);

                        var leftMostByteBit = fourBytePayLoadLen[0];
                        var secondLeftByteBit = fourBytePayLoadLen[1];
                        var thirdLeftByteBit = fourBytePayLoadLen[2];
                        var fourthLeftByteBit = fourBytePayLoadLen[3];
                        var fifthLeftMostByteBit = fourBytePayLoadLen[4];
                        var sixthLeftByteBit = fourBytePayLoadLen[5];
                        var seventhLeftByteBit = fourBytePayLoadLen[6];
                        var leastOneByteBit = fourBytePayLoadLen[7]

                        bufferWholeLen = (leftMostByteBit << 56) + (secondLeftByteBit << 48) + (thirdLeftByteBit << 40) + (fourthLeftByteBit << 32) + (fifthLeftMostByteBit << 24) + (sixthLeftByteBit << 16) + (seventhLeftByteBit << 8) + leastOneByteBit;
                        console.log("bufferWholeLen is: " + bufferWholeLen);//68585    
                        console.log("bufferWholeLen in binary is: " + bufferWholeLen.toString(2));//

                        bufferMaskArray = webSocketSendData.slice(10, 14);
                        console.log("bufferMaskArray length : " + bufferMaskArray.length);
                        bufferPayLoadArray = webSocketSendData.slice(14, webSocketSendData.length);
                        console.log("bufferPayLoadArray length : " + bufferPayLoadArray.length);// 65522


                        //NO.1: -------frame 126 + ===127 + continue buffer
                        if (finBit == 128 && useCumulateFrameFlag == true && (bufferPayLoadArray.length < bufferWholeLen)) {
                            // 128 means final frame, true means only for multi-frame, not for the first 127 then buffer
                            // concanate cumulateFrameArray from ==126 with what read at here ==127
                            // combine these two, continue buffering

                            console.log("continue buffering 163");
                            bufferRead = true;
                            bufferLeftRead = bufferWholeLen - bufferPayLoadArray.length;
                            console.log("bufferLeftRead: " + bufferLeftRead);
                        }

                        //---------
                        //NO.2:
                        // regular start directly from ==127 + continue buffering 
                        // check if it needs buffering, not if, it will buffer for sure, cuz wholeLen <65536 will go into ==126
                        if (finBit == 128 && bufferPayLoadArray.length < bufferWholeLen && useCumulateFrameFlag == false) {   // 65481  <68585

                            console.log("continue buffering 173");
                            bufferRead = true;
                            bufferLeftRead = bufferWholeLen - bufferPayLoadArray.length;
                            console.log("bufferLeftRead: " + bufferLeftRead);
                        }

                        //---------
                        //NO.3:  ==127 frame+ buffer + 126frame note: when 127 frame, there must be buffer follow, cuz 127 represent more than one socket read
                        if (finBit == 0 && (bufferPayLoadArray.length <= bufferWholeLen)) {
                            // seven picture
                            payLoadLessWholeLen = true;
                            useCumulateFrameFlag = true; // finBit=0; means we will need cumulate Frame, so flag turn to true  
                            console.log("first cumulateFrameArray in == 127");
                            var buf1 = Buffer.from(cumulateFrameArray);
                            var buf2 = Buffer.from(bufferPayLoadArray);
                            var list = [buf1, buf2];
                            var newbuff = Buffer.concat(list);
                            cumulateFrameArray = newbuff;
                            console.log("cumulateFrameArray.length: " + cumulateFrameArray.length);

                            //XOR
                            var cumulateFrameArrayXOR = [];
                            for (var i = 0; i < cumulateFrameArray.length; i++) {

                                var maskIndex = i % 4;

                                var origionalMessage = cumulateFrameArray[i] ^ (bufferMaskArray[maskIndex]);

                                cumulateFrameArrayXOR.push(origionalMessage);

                            }
                            cumulateFrameArray = cumulateFrameArrayXOR;
                            bufferRead = true;
                            bufferLeftRead = bufferWholeLen - bufferPayLoadArray.length;
                            console.log("bufferLeftRead: " + bufferLeftRead);
                        }


                    }
                    /* Here is receive websocket frame from client*/
                    else if (payLoadLenInt < 126) {
                        isText = true;
                        maskArray = webSocketSendData.slice(2, 6);
                        console.log("maskArray length : " + maskArray.length);
                        payLoadArray = webSocketSendData.slice(6, webSocketSendData.length);
                        console.log("payLoadArray length : " + payLoadArray.length);

                        /* works for ascii not work for utf8 chinese
                        for (var i = 0; i < payLoadArray.length; i++) {
        
                            var maskIndex = i % 4;
        
                            var origionalMessage = payLoadArray[i] ^ (maskArray[maskIndex]);
        
                            messageArray.push(origionalMessage.toString(2).padStart(8, '0'));
        
                        }*/

                        for (var i = 0; i < payLoadArray.length; i++) {

                            var maskIndex = i % 4;

                            var origionalMessage = payLoadArray[i] ^ (maskArray[maskIndex]);

                            messageArray.push(origionalMessage);

                        }

                        var one = Buffer.from(messageArray);
                        var utfString = one.toString('utf8');
                        // console.log("utfString: " + utfString);
                        //{"username":"jessi","comment":"I am good"}
                        /*
                        var sentMessageJSON = '';
        
                        for (var i = 0; i < messageArray.length; i++) {
                            sentMessageJSON += String.fromCharCode(parseInt(messageArray[i], 2));
                        }  */

                        //console.log("sentMessageJSON: " + sentMessageJSON);
                        console.log("messageArray length: " + messageArray.length);

                        var commentAfterReplace = utfString.replace(/&/g, "&amp;");
                        commentAfterReplace = commentAfterReplace.replace(/</g, "&lt;");
                        commentAfterReplace = commentAfterReplace.replace(/>/g, "&gt;");
                        messageArrayRemove = Buffer.from(commentAfterReplace);// var messageArrayRemove = Buffer.from(commentAfterReplace);
                        //console.log("messageArrayRemove: " + messageArrayRemove.toString('utf8'));

                        // insert JSON to database  body = JSON.parse(body);
                        //var myobj = commentAfterReplace;
                        //Parse a string (written in JSON format) and return a JavaScript object:
                        var myobj = JSON.parse(commentAfterReplace);

                        if ("start_chating" in myobj) {
                            console.log("in 297");
                            chating = true;
                            chatingPerson = myobj["start_chating"];
                        }
                        else if ('end_chating' in myobj) {
                            chating = false;


                        }

                        dbo.collection("customers").insertOne(myobj, function (err, res) {
                            if (err) throw err;
                            console.log("Number of documents inserted: " + res.insertedCount);
                            //db.close();
                        });

                        /*
                        var messageTable = '';
                        for (var i = 0; i < messageArray.length; i++) {
                            var eachByte = messageArray[i].toString(2);
        
        
        
                            messageTable = messageTable + eachByte.padStart(8, '0') + '_';
                            if (i % 4 == 3) {
                                messageTable += '\n';
                            }
        
                        }
                        console.log("messageTable is: \n" + messageTable); 
                        */



                    }
                    // for actual extend payload length is X>=126 X<65,536
                    else if (payLoadLenInt == 126) { //111 1110 read next 2 bytes as payload len

                        //var twoBytePayloadLen = webSocketSendData.slice(1, 4);
                        var twoBytePayLoadLen = webSocketSendData.slice(2, 4);
                        var mostOneByteBit = twoBytePayLoadLen[0];
                        var leastOneByteBit = twoBytePayLoadLen[1];
                        const wholeLen = (mostOneByteBit << 8) + leastOneByteBit;
                        console.log("wholeLen is: " + wholeLen);
                        console.log("wholeLen in binary is: " + wholeLen.toString(2));

                        maskArray = webSocketSendData.slice(4, 8);
                        console.log("maskArray length : " + maskArray.length);
                        payLoadArray = webSocketSendData.slice(8, webSocketSendData.length);
                        console.log("payLoadArray length : " + payLoadArray.length);

                        // use both for text and image 
                        for (var i = 0; i < payLoadArray.length; i++) {

                            var maskIndex = i % 4;

                            var origionalMessage = payLoadArray[i] ^ (maskArray[maskIndex]);

                            messageArray.push(origionalMessage);

                        }
                        // do not store or send to client socket but cumulate the frame payload content
                        console.log("messageArray.length: " + messageArray.length)

                        // for image multi-frame use 
                        if (finBit == 0) {


                            var buf1 = Buffer.from(cumulateFrameArray);
                            var buf2 = Buffer.from(messageArray);
                            var list = [buf1, buf2];
                            var newbuff = Buffer.concat(list);
                            cumulateFrameArray = newbuff;
                            console.log("328_cumulateFrameArray.length: " + cumulateFrameArray.length);
                            useCumulateFrameFlag = true;
                            console.log("330finBIt: " + finBit);
                        }


                        console.log("useCumulateFrameFlag: " + useCumulateFrameFlag);
                        console.log("finBIt: " + finBit);
                        // for last multi-frame use // have to reset back to false, otherwise, the 126 medium size page with 128 will go into this loop as well
                        if (finBit == 128 && useCumulateFrameFlag == true) { // should compare with size not use the flag, cumulate more than 2 times

                            console.log("in 411 ");
                            var buf1 = Buffer.from(cumulateFrameArray);
                            var buf2 = Buffer.from(messageArray);
                            var list = [buf1, buf2];
                            var newbuff = Buffer.concat(list);
                            cumulateFrameArray = newbuff;
                            console.log("416_cumulateFrameArray.length: " + cumulateFrameArray.length);
                            //useCumulateFrameFlag = true;

                        }


                        // receive large image with full frames cumulated ready to save images
                        // do not know why new frame opcode is 0
                        if (opcode == 0 && finBit == 128 && useCumulateFrameFlag == true) {
                            console.log("In 425");
                            // do not store or send to client socket but cumulate the frame payload content


                            // finBit==1 do the

                            //console.log("&&&&sending binary: " + opcode);
                            //console.log("------sending binary: " + opcode);
                            const fs = require('fs');
                            imageNameConventionCount = imageNameConventionCount + 1;
                            var imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                            //console.log("&&& imageNameConventionCount: " + imageNameConventionCount);

                            console.log("cumulateFrameArray vs wholeLen?: " + cumulateFrameArray.length);
                            var senderNameLen = parseInt(cumulateFrameArray[0].toString(2), 2);//parseInt(messageArray[0].toString(2), 2)
                            console.log("senderNameLen: " + senderNameLen);
                            var senderNameArray = cumulateFrameArray.slice(1, 1 + senderNameLen);
                            // console.log("senderNameArray" + senderNameArray.toString('utf8'));
                            // this is wrong. senderNameArray here is arrayBuffer
                            // use TextDecoder
                            var enc = new TextDecoder("utf-8");
                            //console.log("!!!!AB to Str: " + enc.decode(Buffer.from(senderNameArray)));//The "input" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of Array
                            var senderNameinStr = enc.decode(Buffer.from(senderNameArray));
                            console.log("!!!!AB to Str: " + senderNameinStr);

                            var imageContent = cumulateFrameArray.slice(1 + senderNameLen, cumulateFrameArray.length);
                            var buf1 = Buffer.from(imageContent);

                            fs.writeFile(imageStorePath, buf1, 'binary', function (err) {
                                // throws an error, you could also catch it here
                                if (err) throw err;

                                // success case, the file was saved
                                console.log('\n image saved!');
                                //});

                                // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                                var imagePathInMap = '/' + imageStorePath;
                                staticFiles.set(imagePathInMap, "image/jpeg");
                                //console.log("static Files : " + staticFiles.get("/image/new1.jpg"));
                                flag = false;



                                var sendFrameArray = [];
                                var firstByte = 129; //1000 0001 because it's the image path not the content
                                sendFrameArray.push(firstByte);


                                //'<h1><img src="' + value[0] + '"width="150" height="150" /><h1/>' 
                                var imagePathInBi = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                                //var lenForImagePath = imagePathInBi.length;
                                //console.log("lenForImagePath: " + lenForImagePath);

                                //{"_id":"6071a71738832a479c7207e2","username":"Yan Li","comment":"李艳"}
                                //{ 'username': chatName, 'ImagePath': ScrPath }
                                var sendContent = JSON.stringify({ 'SenderName': senderNameinStr, 'ImagePath': imagePathInBi });
                                //console.log("JSON" + sendContent);
                                const JSONsize = Buffer.byteLength(sendContent);

                                if (JSONsize < 126) {
                                    console.log("imageSending <126");
                                    sendFrameArray.push(JSONsize)
                                    //
                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(sendContent);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    // reset  cumulateFrameArray to 
                                    // cumulateFrameArray=[];
                                    //console.log("cumulateFrameArray.length: " + cumulateFrameArray.length);
                                    if (chating == true) {
                                        username_socket.get(chatingPerson).write(newbuff);
                                        socket.write(newbuff);
                                    }
                                    else {
                                        // for (var i = 0; i < clientSocket.length; i++) {
                                        //     clientSocket[i].write(newbuff);
                                        // }
                                    }
                                }


                            });
                            // reset cumulateFrameArray
                            var emptyArray = [];
                            cumulateFrameArray = emptyArray;
                            useCumulateFrameFlag = false;// reset back.
                        }
                        // receive small image
                        else if (opcode == 2 && finBit == 128) {

                            // do not store or send to client socket but cumulate the frame payload content

                            console.log("in 514");
                            // finBit==1 do the

                            //console.log("&&&&sending binary: " + opcode);
                            console.log("------sending binary: " + opcode);
                            const fs = require('fs');
                            imageNameConventionCount = imageNameConventionCount + 1;
                            var imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                            //console.log("&&& imageNameConventionCount: " + imageNameConventionCount);

                            console.log("compare len same with wholeLen?: " + messageArray.length);
                            var senderNameLen = parseInt(messageArray[0].toString(2), 2);//parseInt(messageArray[0].toString(2), 2)
                            console.log("senderNameLen: " + senderNameLen);
                            var senderNameArray = messageArray.slice(1, 1 + senderNameLen);
                            // console.log("senderNameArray" + senderNameArray.toString('utf8'));
                            // this is wrong. senderNameArray here is arrayBuffer
                            // use TextDecoder
                            var enc = new TextDecoder("utf-8");
                            //console.log("!!!!AB to Str: " + enc.decode(Buffer.from(senderNameArray)));//The "input" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of Array
                            var senderNameinStr = enc.decode(Buffer.from(senderNameArray));
                            console.log("!!!!AB to Str: " + senderNameinStr);

                            var imageContent = messageArray.slice(1 + senderNameLen, messageArray.length);
                            var buf1 = Buffer.from(imageContent);

                            fs.writeFile(imageStorePath, buf1, 'binary', function (err) {
                                // throws an error, you could also catch it here
                                if (err) throw err;

                                // success case, the file was saved
                                console.log('\n image saved!');
                                //});

                                // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                                var imagePathInMap = '/' + imageStorePath;
                                staticFiles.set(imagePathInMap, "image/jpeg");
                                //console.log("static Files : " + staticFiles.get("/image/new1.jpg"));
                                flag = false;



                                var sendFrameArray = [];
                                var firstByte = 129; //1000 0001 because it's the image path not the content
                                sendFrameArray.push(firstByte);


                                //'<h1><img src="' + value[0] + '"width="150" height="150" /><h1/>' 
                                var imagePathInBi = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                                //var lenForImagePath = imagePathInBi.length;
                                //console.log("lenForImagePath: " + lenForImagePath);

                                //{"_id":"6071a71738832a479c7207e2","username":"Yan Li","comment":"李艳"}
                                //{ 'username': chatName, 'ImagePath': ScrPath }
                                var sendContent = JSON.stringify({ 'SenderName': senderNameinStr, 'ImagePath': imagePathInBi });
                                //console.log("JSON" + sendContent);
                                const JSONsize = Buffer.byteLength(sendContent);

                                if (JSONsize < 126) {
                                    console.log("imageSending <126");
                                    sendFrameArray.push(JSONsize)
                                    //
                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(sendContent);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    if (chating == true) {
                                        console.log("559 chating is true")
                                        username_socket.get(chatingPerson).write(newbuff);
                                        socket.write(newbuff);
                                    }
                                    else {
                                        // for (var i = 0; i < clientSocket.length; i++) {
                                        //      clientSocket[i].write(newbuff);
                                        //  }
                                    }
                                }


                            });

                        }
                        // sending text message
                        else if (opcode == 1 && finBit == 128) {
                            isText = true;
                            var one = Buffer.from(messageArray);
                            var utfString = one.toString('utf8');
                            //console.log("utfString: " + utfString);

                            var commentAfterReplace = utfString.replace(/&/g, "&amp;");
                            commentAfterReplace = commentAfterReplace.replace(/</g, "&lt;");
                            commentAfterReplace = commentAfterReplace.replace(/>/g, "&gt;");
                            var messageArrayRemove = Buffer.from(commentAfterReplace);// var messageArrayRemove = Buffer.from(commentAfterReplace);
                            //console.log("messageArrayRemove: " + messageArrayRemove.toString('utf8'));

                            //insert into database
                            //var myobj = commentAfterReplace;
                            var myobj = JSON.parse(commentAfterReplace);
                            dbo.collection("customers").insertOne(myobj, function (err, res) {
                                if (err) throw err;
                                console.log("Number of documents inserted: " + res.insertedCount);
                                //db.close();
                            });


                        }

                    }

                
                }
            }
                else { // parse buffered data of the frame
                    // keep store into the bufferWSArray until reach the whole, then XOR
                    console.log("second buffer go in here");
                    //var webSocketSendData = Buffer.from(data); //above

                    // this is for the regular first start is ==127 then buffer; not like frame+ ==127 + buffer
                    // therefore we use bufferPayLoadArray not the cumulateFrameArray
                    var buf1 = Buffer.from(bufferPayLoadArray);
                    var buf2 = Buffer.from(webSocketSendData);
                    var buf3 = buf2.slice(0, bufferLeftRead);
                    var leftForSecondFrame = buf2.slice(bufferLeftRead, buf2.length);

                    console.log("bufferLeftRead : " + bufferLeftRead);
                    console.log("buf3 length: " + buf3.length);
                    console.log("leftForSecondFrame len: " + leftForSecondFrame.length);
                    var list = [buf1, buf3];
                    var newbuff = Buffer.concat(list);

                    bufferPayLoadArray = newbuff;

                    console.log("bufferPayLoadArray length: " + bufferPayLoadArray.length);
                    if (bufferPayLoadArray.length < bufferWholeLen) {

                        console.log("continue buffering");
                        bufferRead = true;
                    }
                    else if (bufferPayLoadArray.length == bufferWholeLen) {
                        console.log("buffer read end");
                        // start xor the whole and store the image

                        for (var i = 0; i < bufferPayLoadArray.length; i++) {

                            var maskIndex = i % 4;

                            var origionalMessage = bufferPayLoadArray[i] ^ (bufferMaskArray[maskIndex]);

                            bufferPayLoadArrayAfterXOR.push(origionalMessage);

                        }
                        var secondFrameInLeft = [];
                        if (leftForSecondFrame.length >= 126) {
                            // parse this header here
                            console.log("694");

                            var opcodePart = leftForSecondFrame[0];
                            var opcode = opcodePart & 15; // 1111 =15
                            console.log("new frame opcode: " + opcode);
                            var finBit = opcodePart & 128; // 1000 0000
                            console.log("700_finBit: " + finBit);//128 correct


                            var payLoadLen = leftForSecondFrame[1];

                            payLoadLenInt = parseInt(payLoadLen.toString(2), 2) - 128;
                            console.log("706_payLoadLenInt: " + payLoadLenInt);//126 correct

                            var twoBytePayLoadLen = leftForSecondFrame.slice(2, 4);
                            var mostOneByteBit = twoBytePayLoadLen[0];
                            var leastOneByteBit = twoBytePayLoadLen[1];
                            const wholeLen = (mostOneByteBit << 8) + leastOneByteBit;
                            console.log("717_wholeLen is: " + wholeLen);

                            var maskArrayInLeft = leftForSecondFrame.slice(4, 8);
                            console.log("maskArray length : " + maskArrayInLeft.length);
                            var payLoadArrayInLeft = leftForSecondFrame.slice(8, leftForSecondFrame.length);
                            console.log("payLoadArrayInLeft length : " + payLoadArrayInLeft.length);

                            for (var i = 0; i < payLoadArrayInLeft.length; i++) {

                                var maskIndex = i % 4;

                                var origionalMessage = payLoadArrayInLeft[i] ^ (maskArrayInLeft[maskIndex]);

                                secondFrameInLeft.push(origionalMessage);

                            }
                            var buf1 = Buffer.from(bufferPayLoadArrayAfterXOR);
                            var buf2 = Buffer.from(secondFrameInLeft);
                            var list = [buf1, buf2];
                            var newbuff = Buffer.concat(list);
                            cumulateFrameArray = newbuff;

                            // separate the name and image content from bufferPayLoadArrayAfterXOR
                            const fs = require('fs');
                            imageNameConventionCount = imageNameConventionCount + 1;
                            var imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                            //console.log("&&& imageNameConventionCount: " + imageNameConventionCount);

                            var senderNameLen = parseInt(cumulateFrameArray[0].toString(2), 2);
                            console.log("senderNameLen: " + senderNameLen);
                            var senderNameArray = cumulateFrameArray.slice(1, 1 + senderNameLen);
                            // console.log("senderNameArray" + senderNameArray.toString('utf8'));
                            // this is wrong. senderNameArray here is arrayBuffer
                            // use TextDecoder
                            var enc = new TextDecoder("utf-8");
                            //console.log("!!!!AB to Str: " + enc.decode(Buffer.from(senderNameArray)));//The "input" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of Array
                            var senderNameinStr = enc.decode(Buffer.from(senderNameArray));
                            console.log("!!!!AB to Str: " + senderNameinStr);

                            var imageContent = cumulateFrameArray.slice(1 + senderNameLen, cumulateFrameArray.length);
                            var buf1 = Buffer.from(imageContent);

                            fs.writeFile(imageStorePath, buf1, 'binary', function (err) {
                                // throws an error, you could also catch it here
                                if (err) throw err;

                                // success case, the file was saved
                                console.log('\n image saved!');
                                //});

                                // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                                var imagePathInMap = '/' + imageStorePath;
                                staticFiles.set(imagePathInMap, "image/jpeg");
                                //console.log("static Files : " + staticFiles.get("/image/new1.jpg"));
                                flag = false;

                                var sendFrameArray = [];
                                var firstByte = 129; //1000 0001 because it's the image path not the content
                                sendFrameArray.push(firstByte);

                                var imagePathInBi = 'image/new' + imageNameConventionCount.toString() + '.jpg';

                                var sendContent = JSON.stringify({ 'SenderName': senderNameinStr, 'ImagePath': imagePathInBi });
                                //console.log("JSON" + sendContent);
                                const JSONsize = Buffer.byteLength(sendContent);

                                if (JSONsize < 126) {

                                    sendFrameArray.push(JSONsize)
                                    //
                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(sendContent);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    bufferRead = false;
                                    if (chating == true) {
                                        username_socket.get(chatingPerson).write(newbuff);
                                        socket.write(newbuff);
                                    }
                                    else {
                                        // for (var i = 0; i < clientSocket.length; i++) {
                                        //     clientSocket[i].write(newbuff);
                                        // }
                                    }
                                }
                            });
                            bufferPayLoadArrayAfterXOR = [];
                            cumulateFrameArray = [];


                        }
                        // reset the useCumulateFrameFlag to false, or just change here to else if, then it will not go into else{}
                        else if (useCumulateFrameFlag == true) {
                            console.log("combine frame with buffer");
                            //bufferPayLoadArrayAfterXOR
                            var buf1 = Buffer.from(cumulateFrameArray);
                            var buf2 = Buffer.from(bufferPayLoadArrayAfterXOR);
                            var list = [buf1, buf2];
                            var newbuff = Buffer.concat(list);

                            cumulateFrameArray = newbuff;
                            //if (bufferFrameFlag == false) {


                            //--
                            // separate the name and image content from bufferPayLoadArrayAfterXOR
                            const fs = require('fs');
                            imageNameConventionCount = imageNameConventionCount + 1;
                            var imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                            //console.log("&&& imageNameConventionCount: " + imageNameConventionCount);

                            var senderNameLen = parseInt(cumulateFrameArray[0].toString(2), 2);
                            console.log("senderNameLen: " + senderNameLen);
                            var senderNameArray = cumulateFrameArray.slice(1, 1 + senderNameLen);
                            // console.log("senderNameArray" + senderNameArray.toString('utf8'));
                            // this is wrong. senderNameArray here is arrayBuffer
                            // use TextDecoder
                            var enc = new TextDecoder("utf-8");
                            //console.log("!!!!AB to Str: " + enc.decode(Buffer.from(senderNameArray)));//The "input" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of Array
                            var senderNameinStr = enc.decode(Buffer.from(senderNameArray));
                            console.log("!!!!AB to Str: " + senderNameinStr);

                            var imageContent = cumulateFrameArray.slice(1 + senderNameLen, cumulateFrameArray.length);
                            var buf1 = Buffer.from(imageContent);

                            fs.writeFile(imageStorePath, buf1, 'binary', function (err) {
                                // throws an error, you could also catch it here
                                if (err) throw err;

                                // success case, the file was saved
                                console.log('\n image saved!');
                                //});

                                // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                                var imagePathInMap = '/' + imageStorePath;
                                staticFiles.set(imagePathInMap, "image/jpeg");
                                //console.log("static Files : " + staticFiles.get("/image/new1.jpg"));
                                flag = false;

                                var sendFrameArray = [];
                                var firstByte = 129; //1000 0001 because it's the image path not the content
                                sendFrameArray.push(firstByte);

                                var imagePathInBi = 'image/new' + imageNameConventionCount.toString() + '.jpg';

                                var sendContent = JSON.stringify({ 'SenderName': senderNameinStr, 'ImagePath': imagePathInBi });
                                //console.log("JSON" + sendContent);
                                const JSONsize = Buffer.byteLength(sendContent);

                                if (JSONsize < 126) {

                                    sendFrameArray.push(JSONsize)
                                    //
                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(sendContent);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    bufferRead = false;
                                    if (chating == true) {
                                        username_socket.get(chatingPerson).write(newbuff);
                                        socket.write(newbuff);
                                    }
                                    else {
                                        // for (var i = 0; i < clientSocket.length; i++) {
                                        //     clientSocket[i].write(newbuff);
                                        // }
                                    }
                                }
                            });
                            bufferPayLoadArrayAfterXOR = [];
                            cumulateFrameArray = [];
                            //--
                            //}
                        }
                        else {

                            // separate the name and image content from bufferPayLoadArrayAfterXOR
                            const fs = require('fs');
                            imageNameConventionCount = imageNameConventionCount + 1;
                            var imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                            //console.log("&&& imageNameConventionCount: " + imageNameConventionCount);

                            var senderNameLen = parseInt(bufferPayLoadArrayAfterXOR[0].toString(2), 2);
                            console.log("senderNameLen: " + senderNameLen);
                            var senderNameArray = bufferPayLoadArrayAfterXOR.slice(1, 1 + senderNameLen);
                            // console.log("senderNameArray" + senderNameArray.toString('utf8'));
                            // this is wrong. senderNameArray here is arrayBuffer
                            // use TextDecoder
                            var enc = new TextDecoder("utf-8");
                            //console.log("!!!!AB to Str: " + enc.decode(Buffer.from(senderNameArray)));//The "input" argument must be an instance of ArrayBuffer or ArrayBufferView. Received an instance of Array
                            var senderNameinStr = enc.decode(Buffer.from(senderNameArray));
                            console.log("!!!!AB to Str: " + senderNameinStr);

                            var imageContent = bufferPayLoadArrayAfterXOR.slice(1 + senderNameLen, bufferPayLoadArrayAfterXOR.length);
                            var buf1 = Buffer.from(imageContent);

                            fs.writeFile(imageStorePath, buf1, 'binary', function (err) {
                                // throws an error, you could also catch it here
                                if (err) throw err;

                                // success case, the file was saved
                                console.log('\n image saved!');
                                //});

                                // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                                var imagePathInMap = '/' + imageStorePath;
                                staticFiles.set(imagePathInMap, "image/jpeg");
                                //console.log("static Files : " + staticFiles.get("/image/new1.jpg"));
                                flag = false;

                                var sendFrameArray = [];
                                var firstByte = 129; //1000 0001 because it's the image path not the content
                                sendFrameArray.push(firstByte);

                                var imagePathInBi = 'image/new' + imageNameConventionCount.toString() + '.jpg';

                                var sendContent = JSON.stringify({ 'SenderName': senderNameinStr, 'ImagePath': imagePathInBi });
                                //console.log("JSON" + sendContent);
                                const JSONsize = Buffer.byteLength(sendContent);

                                if (JSONsize < 126) {

                                    sendFrameArray.push(JSONsize)
                                    //
                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(sendContent);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    bufferRead = false;
                                    if (chating == true) {
                                        username_socket.get(chatingPerson).write(newbuff);
                                        socket.write(newbuff);
                                    }
                                    else {
                                        // for (var i = 0; i < clientSocket.length; i++) {
                                        //     clientSocket[i].write(newbuff);
                                        // }
                                    }
                                }
                            });
                            bufferPayLoadArrayAfterXOR = [];
                            // var emptyArray=[];
                            // bufferPayLoadArrayAfterXOR=emptyArray;
                        }
                    }

                }
                //----------End for ==127 for large image-------------------------------------
                var webFrameTable = '';

                for (var i = 0; i < webSocketSendData.length; i++) {
                    var eachByte = webSocketSendData[i].toString(2);

                    // if (i % 4 != 3) {
                    //     webFrameTable += eachByte + '_';
                    // }
                    // else { webFrameTable += eachByte; }

                    webFrameTable = webFrameTable + eachByte.padStart(8, '0') + '_';
                    if (i % 4 == 3) {
                        webFrameTable += '\n';
                    }

                }
                //console.log("webFrameTable is: \n" + webFrameTable);


                //-----------below send frame to client--------------------------------
                /*
                var buf1 = Buffer.from(bufferReadArray);
                var buf2 = Buffer.from(data);
                var list = [buf1, buf2];
                var newbuff = Buffer.concat(list); */
                //------------------------------------

                // send text chat frame back to client, not for buffer
                if (opcode != 2 && isText == true) {// 0010=2 which is binary

                    //}
                    //bufferReadArray = newbuff;
                    var sendFrameArray = [];
                    var firstByte = 129; //1000 0001
                    sendFrameArray.push(firstByte);
                    var messageArrayRemoveLen = messageArrayRemove.length;
                    if (messageArrayRemoveLen < 126) {

                        //
                        sendFrameArray.push(messageArrayRemoveLen)
                        //
                        var buf1 = Buffer.from(sendFrameArray);
                        var buf2 = Buffer.from(messageArrayRemove);
                        var list = [buf1, buf2];
                        var newbuff = Buffer.concat(list);


                        /* this is for hw4 object 3 if chat history store in the datastructure
                        chatHistoryArray.push(newbuff);
                        */
                        // for object 4, in the database we already insert in after the replace the html tag above

                        if (chating == true) {
                            username_socket.get(chatingPerson).write(newbuff);
                            socket.write(newbuff);
                        }
                        else {
                            // for (var i = 0; i < clientSocket.length; i++) {
                            //     clientSocket[i].write(newbuff);
                            // }
                        }

                    } else if (messageArrayRemoveLen >= 126) {

                        sendFrameArray.push(126);
                        console.log("messageArrayRemoveLen: " + messageArrayRemoveLen);
                        console.log("messageArrayRemoveLen in Binary: " + messageArrayRemoveLen.toString(2));

                        var mostOneByteBit = messageArrayRemoveLen & 65280;
                        console.log("mostOneByteBit: " + mostOneByteBit.toString(2));
                        var mostOneByteBitAfterShift = mostOneByteBit >> 8;

                        var leastOneByteBit = messageArrayRemoveLen & 255;
                        console.log("leastOneByteBit: " + leastOneByteBit.toString(2));
                        sendFrameArray.push(mostOneByteBitAfterShift);
                        sendFrameArray.push(leastOneByteBit);

                        var buf1 = Buffer.from(sendFrameArray);
                        var buf2 = Buffer.from(messageArrayRemove);
                        var list = [buf1, buf2];
                        var newbuff = Buffer.concat(list);


                        /* this is for hw4 object 3 if chat history store in the datastructure
                        chatHistoryArray.push(newbuff);
                        */
                        // for object 4, in the database we already insert in after the replace the html tag above

                        if (chating == true) {
                            username_socket.get(chatingPerson).write(newbuff);
                            socket.write(newbuff);
                        }
                        else {
                            // for (var i = 0; i < clientSocket.length; i++) {
                            //     clientSocket[i].write(newbuff);
                            // }
                        }

                    }
                    //isText = false; // due put inside data so no need to reset
                }//opcode != 2

            }

            // if not websocket then handle as http POST GET request
            else {

                var crlfcrlf = Buffer.from("\r\n\r\n", 'utf-8');
                var crlfcrlfLen = crlfcrlf.length;
                var headerEndIndex = data.indexOf(crlfcrlf);
                var headerPart = data.slice(0, headerEndIndex);

                const headerPartInString = headerPart.toString();

                //console.log("---header:"+headerPartInString); // header is safe separeted now

                const lines = headerPartInString.split("\r\n"); // this is to seperate the first line of header with other rest part of header
                console.log("total line in the Header" + lines.length);
                const requestLine = lines[0]; //lines[0] is the header of request which is  GET / HTTP/1.1      
                const parts = requestLine.split(" ");


                //handle hw3's buffering
                if (parts.length !== 3) {//damn this is for the second continous buffer read
                    // not for the first time request header read parse
                    // then we wont use the parts[], just use the DATA as a whole for the image body content
                    // because for the header the first line will always be 3, request type, request path and httpversion

                    //ReadOfBodyLength = data.length + ReadOfBodyLength;
                    //console.log("data type is " + Object.prototype.toString.call(data));
                    //bufferReadArray.push(...data);
                    //bufferReadArray.push.apply(bufferReadArray, data);
                    //Array.prototype.push.apply(bufferReadArray, data);
                    // data.slice(startIndex, endIndex)
                    // temp = new Uint8Array(bufferReadArray.byteLength + data.byteLength);
                    // temp.set(new Uint8Array(bufferReadArray), 0);
                    // temp.set(new Uint8Array(data), bufferReadArray.byteLength);
                    // bufferReadArray = temp;
                    var buf1 = Buffer.from(bufferReadArray);
                    var buf2 = Buffer.from(data);
                    var list = [buf1, buf2];
                    var newbuff = Buffer.concat(list);

                    bufferReadArray = newbuff;

                    //bufferReadArray = Buffer.concat(bufferReadArray, data);
                    //console.log("bufferReadArray type is " + Object.prototype.toString.call(bufferReadArray));

                    // if (data.length != bufferReadArray.length) {
                    //     console.log("!!length got wrong");
                    // }
                    // for (i = 0; i < data.length; i++) {
                    //     if (data[i] != bufferReadArray[i]) {
                    //         console.log("!!wrong Read");
                    //     }
                    // }

                    console.log("bufferReadArray length is: " + bufferReadArray.length);
                    //console.log("imageFormContentLength is:" + imageFormContentLength);
                    // console.log("ReadOfBodyLength is:" + ReadOfBodyLength);
                    if (bufferReadArray.length == imageFormContentLength) {
                        // get the image file first 
                        // read all the iamge data into file here and store into image folder
                        // which is like the dodyPart
                        console.log("finish reading files");
                        // start parse body part to get the image and the caption
                        var boundarySepInBi = Buffer.from(imageBoundarySep, 'utf-8');
                        var boundarySepInBiLen = boundarySepInBi.length;
                        //console.log("????boundarySepInBiLen is : " + boundarySepInBiLen); // 40 is correct

                        var imageStartBoundIndex = bufferReadArray.indexOf(boundarySepInBi);
                        //console.log("????imageStartBoundIndex is : " + imageStartBoundIndex);

                        var imageEndBoundIndex = bufferReadArray.indexOf(boundarySepInBi, imageStartBoundIndex + boundarySepInBiLen);
                        //console.log("????imageEndBoundIndex is : " + imageEndBoundIndex);

                        var crlf = Buffer.from("\r\n", 'utf-8');
                        var crlfLen = crlf.length;
                        var imagePart = bufferReadArray.slice(imageStartBoundIndex + boundarySepInBiLen + crlfLen, imageEndBoundIndex - crlfLen);

                        //-- get image binary content
                        var StartImageIndex = imagePart.indexOf(crlfcrlf);
                        console.log("????crlfcrlf index at :" + StartImageIndex);
                        var imageBinaryContent = imagePart.slice(StartImageIndex + crlfcrlfLen, imagePart.length); // open interval for slice() no need -1

                        console.log("iamge size is: " + imageBinaryContent.length);



                        // write into file
                        const fs = require('fs');
                        // try {
                        //     const data = fs.writeFileSync('/image/images.jpg', imageBinaryContent)
                        //     console.log("adding new images");
                        // } catch (err) {
                        //     console.error(err)
                        // }

                        imageNameConventionCount = imageNameConventionCount + 1;
                        //imageStoreName = 'new' + imageNameConventionCount.toString();
                        imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                        console.log("&&& imageNameConventionCount: " + imageNameConventionCount);

                        // don't put /image/new.jpg this will inteprete as C: /image/new.jpg
                        // if you just put image/new.jpg  this means it's under current working directory which is page
                        // ** notice! it by defaut is current working directory /  therefore just put image/new.jpg will become as "currentdirectory/image/new.jpg"
                        //fs.writeFile("image/new.jpg", imageBinaryContent, 'binary', function (err) {
                        fs.writeFile(imageStorePath, imageBinaryContent, 'binary', function (err) {
                            // throws an error, you could also catch it here
                            if (err) throw err;

                            // success case, the file was saved
                            console.log('\n image saved!');
                            //});

                            // parse caption

                            //get captionPart
                            var fileEndBoundIndex = bufferReadArray.indexOf(boundarySepInBi, imageEndBoundIndex + boundarySepInBiLen);
                            var captionPart = bufferReadArray.slice(imageEndBoundIndex + boundarySepInBiLen + crlfLen, fileEndBoundIndex - crlfLen);// cuz there /r/n infront of fileStartBoundIndex


                            //-- get user's caption in string
                            var StartCaptionIndex = captionPart.indexOf(crlfcrlf);
                            var captionInBinary = captionPart.slice(StartCaptionIndex + crlfcrlfLen, captionPart.length); // open interval for slice() no need -1
                            var captionInString = captionInBinary.toString('utf8');
                            console.log("captionInString is :" + captionInString);

                            //html injection var res = str.replace(/blue/g, "red");
                            var captionAfterReplace = captionInString.replace(/&/g, "&amp;");
                            captionAfterReplace = captionAfterReplace.replace(/</g, "&lt;");
                            captionAfterReplace = captionAfterReplace.replace(/>/g, "&gt;");


                            //imageCaptionArray.push([imageStoreName, captionAfterReplace]);
                            userMessageMapArray.push([imageStorePath, captionAfterReplace]);
                            // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                            var imagePathInMap = '/' + imageStorePath;
                            staticFiles.set(imagePathInMap, "image/jpeg");
                            //console.log("static Files : " + staticFiles.get("/image/new1.jpg"));
                            flag = false;
                            socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");
                        });
                        //-----------------------------------------
                    }

                }
                // parse this as request header and some part of content body part
                else {

                    //console.log("sample: " + data.slice(0, 1024));// show the header info for object 3 

                    //console.log("sample: " + data.slice(0, 2048));
                    const requestType = parts[0];
                    const requestPath = parts[1];
                    const HTTPVersion = parts[2];
                    //console.log(requestLine);
                    // console.log(requestType);
                    //console.log(requestPath);
                    //var a=requestPath.substring(0, 7)
                    //console.log(a); //images
                    //console.log(HTTPVersion);
                    // socket write will convert string to byte array for us

                    //-hw5 ob2--------------------------
                    if (requestType === "POST" && requestPath === "/registration") {
                        console.log("in Registration");
                        var namePassArray = parsePassword(lines, data, headerEndIndex, crlfcrlf, crlfcrlfLen);
                        console.log(namePassArray[0] + namePassArray[1]);

                        //-----hw5 bonus below

                        /**
                         *  8 lenth
                         *  1 lower
                         * 1 upper
                         * 1 number
                         * 1 special
                         * additional A repeated character or a series of characters (e.g., AAAAA or 12345).
                         */
                        var nameLen = namePassArray[1].length;
                        var uppercase = 0;
                        var lowercase = 0;
                        var digit = 0;
                        var specialChar = 0;
                        var checkFlag = true;
                        var str = namePassArray[1]
                        // for (var i = 0; i < str.length; i++) {

                        //     console.log(str[i] + "\n");
                        // }
                        for (var i = 0; i < str.length; i++) {
                            if (str[i] >= "A" && str[i] <= "Z") { uppercase++; }
                            else if (str[i] >= "a" && str[i] <= "z") { lowercase++; }
                            else if (str[i] >= "0" && str[i] <= "9") { digit++; }
                            else specialChar++;
                        }
                        console.log(" uppercase: " + uppercase);
                        console.log(" lowercase: " + lowercase);
                        console.log("digit : " + digit);
                        console.log(" specialChar: " + specialChar);
                        console.log("nameLen : " + nameLen);
                        if (!((uppercase >= 1) && (lowercase >= 1) && (digit >= 1) && (specialChar >= 1) && (nameLen >= 8))) {
                            checkFlag = false;
                            console.log("fail count");
                        }


                        for (var i = 0; i < str.length; i++) {
                            if (str[i] >= "A" && str[i] <= "Z") {
                                uppercase++;
                                if (i + 1 < str.length) {
                                    if (str[i] == str[i + 1]) {
                                        checkFlag = false;
                                        console.log("fail AA");
                                    }
                                }
                            }
                            else if (str[i] >= "a" && str[i] <= "z") {
                                lowercase++;
                                if (i + 1 < str.length) {
                                    if (str[i] == str[i + 1]) {
                                        checkFlag = false;
                                        console.log("fail aa");
                                    }
                                }
                            }
                            else if (str[i] >= "0" && str[i] <= "9") {
                                digit++;
                                if (i + 1 < str.length) {
                                    if (str[i] == str[i + 1]) {
                                        checkFlag = false;
                                        console.log("fail 11");
                                    }
                                    if ((parseInt(str[i], 10) + 1) == parseInt(str[i + 1], 10)) {
                                        checkFlag = false;
                                        console.log("fail 12");
                                    }
                                }
                            }
                            else {
                                specialChar++;
                                if (i + 1 < str.length) {
                                    if (str[i] == str[i + 1]) {
                                        checkFlag = false;
                                        console.log("fail !!");
                                    }
                                }
                            }
                        }


                        if (checkFlag == false) {
                            console.log("Wrong Password!");
                            // socket write
                            let formReplacePlaceHolder = new Map([
                                ["title", "Your password does not meet requirement!"],
                                ["description", ""],
                                ["textSendPart", ''],
                                ["loop", ""],
                                ["content_from_data_structure", ""],
                                ["end_loop", ""]
                            ]);
                            var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                            socket.write(sendTextResponse(completeHtml, "text/html"));
                        }
                        else {
                            console.log("!!!!Password Format correct!");
                            // store password into DB
                            //-------hw5 bonus above
                            // add salt and hash here
                            //var bcrypt = require('bcryptjs');
                            var salt = bcrypt.genSaltSync();
                            var hash = bcrypt.hashSync(namePassArray[1], salt);

                            //var passwordKeyValue = '{ "name":"John", "birth":"1986-12-14", "city":"New York"}'
                            var passwordKeyValue = '{ "name":' + '"' + namePassArray[0] + '"' + ', ' + '"password":' + '"' + hash + '"' + '}';
                            //var myobj = JSON.parse({ "name": commentorNameInString, "password": hash });
                            var myobj = JSON.parse(passwordKeyValue);

                            dbo.listCollections().toArray(function (err, items) {
                                if (err) throw err;
                                //console.log("in 655");
                                //console.log("collections: " + items[0].name);
                                // if mongo database exist

                                var i;
                                var existFlag = false;
                                var registerFlag = false;
                                var formReplacePlaceHolder = new Map();
                                for (i = 0; i < items.length; i++) {
                                    console.log("in side for loop");
                                    if (items[i].name == 'password') {
                                        existFlag = true;
                                        console.log("found Password table, then insert");

                                        // if username exist then prevent insert
                                        // find the username exist or not first
                                        dbo.collection("password").findOne({ name: namePassArray[0] }, { _id: 0 }, function (err, result) {
                                            if (err) throw err;

                                            if (result == null) {
                                                registerFlag = true;
                                                console.log("new user registered");
                                                //insert into password colloection
                                                //var myobj = JSON.parse(passwordKeyValue);
                                                dbo.collection("password").insertOne(myobj, function (err, res) {
                                                    if (err) throw err;
                                                    console.log("new password username inserted: " + res.insertedCount);
                                                    //registerFlag = true;// if you put here it will wait long time 
                                                });
                                                formReplacePlaceHolder = new Map([
                                                    ["title", "Account registered successfully, Please back to homepage to sign in"],
                                                    ["description", ""],
                                                    ["textSendPart", ''],
                                                    ["loop", ""],
                                                    ["content_from_data_structure", ""],
                                                    ["end_loop", ""]
                                                ]);
                                            }
                                            // if user exist
                                            else {
                                                console.log("Account registered already");
                                                formReplacePlaceHolder = new Map([
                                                    ["title", "Account exists already,please Sign In"],
                                                    ["description", ""],
                                                    ["textSendPart", ''],
                                                    ["loop", ""],
                                                    ["content_from_data_structure", ""],
                                                    ["end_loop", ""]
                                                ]);
                                            }
                                            //
                                            console.log("730_registerFlag: " + registerFlag);
                                            if (registerFlag == true) {
                                                var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                                                socket.write(sendTextResponse(completeHtml, "text/html"));
                                            } else {
                                                var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                                                socket.write(sendTextResponse(completeHtml, "text/html"));
                                            }

                                        });
                                    }
                                }
                                if (existFlag == false) {
                                    // create the password table at here
                                    console.log("in here")
                                    dbo.createCollection("password", function (err, res) {
                                        if (err) throw err;
                                        console.log("Password Collection first created!");
                                        //db.close();

                                        // after create then insert
                                        //var myobj = JSON.parse(passwordKeyValue);
                                        dbo.collection("password").insertOne(myobj, function (err, res) {
                                            if (err) throw err;
                                            console.log("Number of documents inserted: " + res.insertedCount);

                                            formReplacePlaceHolder = new Map([
                                                ["title", "Account registered successfully, Please back to homepage to sign in"],
                                                ["description", ""],
                                                ["loop", ""],
                                                ["content_from_data_structure", ""],
                                                ["end_loop", ""]
                                            ]);
                                            var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                                            socket.write(sendTextResponse(completeHtml, "text/html"));
                                        });


                                    });
                                }
                                //redirect, should have to  no effect
                                //socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");


                            });

                        }// end of checkFlag else}
                    }
                    // hw2_object 1  & hw 4 & hw5 root
                    else if (requestType === "GET" && requestPath === "/") {

                        //---hw5 object_1 ----------------------
                        var n = 0;
                        while (!lines[n].includes("Cookie")) {

                            n++;
                            if (n == lines.length) {
                                console.log("no cookie found");
                                break;
                            }

                        }
                        if (n < lines.length) {
                            // parse and welcome back
                            var cookieLine = lines[n];
                            var onlyCookieKeyValue = cookieLine.substring(8, cookieLine.length);
                            console.log("onlyCookieKeyValue is: " + onlyCookieKeyValue);
                            const cookieLinePart = onlyCookieKeyValue.split(";");

                            var firstTimeVistFlag = false;
                            var authenticatedFlag = false;
                            var usernameInToken = '';
                            var wentAuthen = false;
                            for (var k = 0; k < cookieLinePart.length; k++) {

                                var keyValueOfCookie = cookieLinePart[k].split('=');
                                var keyOfCookie = keyValueOfCookie[0];
                                console.log("keyOfCookie: " + keyOfCookie);
                                var valueOfCookie = keyValueOfCookie[1];
                                console.log("valueOfCookie: " + valueOfCookie);

                                if (keyOfCookie == 'firtTimeVist' && valueOfCookie == 'X6kAwpgW29M') {
                                    firstTimeVistFlag = true;
                                }
                                if (keyOfCookie == ' Authentication') {

                                    wentAuthen = true;
                                    const crypto = require("crypto");
                                    var comparedToken = crypto.createHash('sha1').update(valueOfCookie).digest('hex');
                                    console.log("comparedToken is: " + comparedToken);
                                    dbo.collection("userToken").findOne({ token: comparedToken }, { _id: 0 }, function (err, result) {


                                        //if (err) throw err;
                                        if (result == null) {
                                            console.log("token not found");
                                        } else {
                                            console.log("username is: " + result.name);
                                            //console.log("password is: " + result.token);
                                            usernameInToken = result.name;
                                            authenticatedFlag = true;

                                            //
                                            var textSendPart = '<h3>Now Let us Chat Below! </h3> <label for="chat-name">Name: </label>';
                                            textSendPart += '<input id="chat-name" type="text" name="name"><br />';
                                            textSendPart += '<label for="chat-comment">Comment: </label>';
                                            textSendPart += '<input id="chat-comment" type="text" name="comment">';
                                            textSendPart += '<button onclick="sendMessage();">Chat</button>';

                                            textSendPart += '<br /><br /><br />';

                                            textSendPart += '<div> <label for="image_uploads">Choose images to upload (JPG)</label>';
                                            textSendPart += ' <input type="file" id="imageID" name="chatImage" accept="image/jpeg">';
                                            textSendPart += '<br /><label for="Sender-Name">Picture Sender Name: </label>';
                                            textSendPart += '<input id="Sender-Name" type="text" name="Sender Name">';
                                            textSendPart += '<br /></div><button onclick="sendImage();">Send Image</button>';
                                            //
                                            console.log("firstTimeVistFlag: " + firstTimeVistFlag);
                                            console.log("authenticatedFlag: " + authenticatedFlag);
                                            if (firstTimeVistFlag == true && authenticatedFlag == true) {
                                                console.log("double true here");
                                                let formReplacePlaceHolder = new Map([
                                                    ["title", "Welcome Back! You logged in as " + usernameInToken],
                                                    ["description", ""],
                                                    ["textSendPart", textSendPart],
                                                    ["loop", ""],
                                                    ["content_from_data_structure", ""],
                                                    ["end_loop", ""]
                                                ]);
                                                var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                                                socket.write(sendCookieResponse(completeHtml, "text/html"));
                                            }

                                        }
                                    });
                                    // dbo.collection("customers").find({}).toArray(function (err, result) {
                                    //     console.log("in finding tocken");
                                    // });
                                }
                            }

                            if (firstTimeVistFlag == true && wentAuthen == false) {
                                console.log("one true here");
                                let formReplacePlaceHolder = new Map([
                                    ["title", "Welcome Back, glad you visit us Again!"],
                                    ["description", ""],
                                    ["textSendPart", ''],
                                    ["loop", ""],
                                    ["content_from_data_structure", ""],
                                    ["end_loop", ""]
                                ]);
                                var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                                socket.write(sendCookieResponse(completeHtml, "text/html"));
                            }


                        } else {

                            // first time vist to set the cookie
                            let formReplacePlaceHolder = new Map([
                                ["title", "Welcome for your First Time Visit"],
                                ["description", ""],
                                ["textSendPart", ''],
                                ["loop", ""],
                                ["content_from_data_structure", ""],
                                ["end_loop", ""]
                            ]);
                            var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                            socket.write(sendCookieResponse(completeHtml, "text/html"));
                        }
                    }
                    // hw5 object3 
                    else if (requestType === "POST" && requestPath === "/login") {
                        console.log("in login");
                        var namePassArray = parsePassword(lines, data, headerEndIndex, crlfcrlf, crlfcrlfLen);
                        console.log(namePassArray[0] + namePassArray[1]);

                        dbo.collection("password").findOne({ name: namePassArray[0] }, { _id: 0 }, function (err, result) {

                            if (err) throw err;
                            //console.log(result);
                            console.log("username is: " + result.name);
                            console.log("password is: " + result.password);

                            if (!bcrypt.compareSync(namePassArray[1], result.password)) {
                                console.log("Fail Log in");
                                let formReplacePlaceHolder = new Map([
                                    ["title", "Login Failed, Try your password another time!"],
                                    ["description", ""],
                                    ["textSendPart", ''],
                                    ["loop", ""],
                                    ["content_from_data_structure", ""],
                                    ["end_loop", ""]
                                ]);
                                var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);
                                socket.write(sendTextResponse(completeHtml, "text/html"));

                            }
                            else {
                                /*
                                <script src="functions.js"></script> 
                                */
                                var textSendPart = '<h3>Now Let us Chat Below! </h3> <label for="chat-name">Name: </label>';
                                textSendPart += '<input id="chat-name" type="text" name="name"><br />';
                                textSendPart += '<label for="chat-comment">Comment: </label>';
                                textSendPart += '<input id="chat-comment" type="text" name="comment">';
                                textSendPart += '<button onclick="sendMessage();">Chat</button>';

                                textSendPart += '<br /><br /><br />';

                                textSendPart += '<div> <label for="image_uploads">Choose images to upload (JPG)</label>';
                                textSendPart += ' <input type="file" id="imageID" name="chatImage" accept="image/jpeg">';
                                textSendPart += '<br /><label for="Sender-Name">Picture Sender Name: </label>';
                                textSendPart += '<input id="Sender-Name" type="text" name="Sender Name">';
                                textSendPart += '<br /></div><button onclick="sendImage();">Send Image</button>';

                                console.log("in Logged");
                                justSignInUser = namePassArray[0];
                                console.log("1509: justSing " + justSignInUser);
                                //username_socket.set(justSignInUser, socket);
                                let formReplacePlaceHolder = new Map([
                                    ["title", "You Logged In as " + result.name],
                                    ["description", '<script src="functions.js"></script>'],
                                    ["textSendPart", textSendPart],
                                    ["loop", ""],
                                    ["content_from_data_structure", ""],
                                    ["end_loop", ""]
                                ]);
                                var completeHtml = renderTemplate("index.html", formReplacePlaceHolder);

                                // set authentication cookie here
                                const crypto = require("crypto");
                                var authenticationTocken = crypto.randomBytes(10).toString('hex');
                                console.log("authenticationTocken is: " + authenticationTocken);
                                //var salt = bcrypt.genSaltSync();
                                //var hashedToken = bcrypt.hashSync(authenticationTocken, salt);

                                hashedToken = crypto.createHash('sha1').update(authenticationTocken).digest('hex');
                                console.log("hashedToken when insert into token table" + hashedToken);
                                // insert into userToken table
                                var userTokenKeyValue = '{ "name":' + '"' + namePassArray[0] + '"' + ', ' + '"token":' + '"' + hashedToken + '"' + '}';
                                //var myobj = JSON.parse({ "name": commentorNameInString, "password": hash });
                                var myobj = JSON.parse(userTokenKeyValue);

                                // store (hashed tocken with username) inside of DB
                                dbo.listCollections().toArray(function (err, items) {
                                    if (err) throw err;
                                    //console.log("in 663");
                                    // if mongo database exist

                                    var i;
                                    var existFlag = false;


                                    for (i = 0; i < items.length; i++) {
                                        console.log("in side for loop");
                                        if (items[i].name == 'userToken') {
                                            existFlag = true;
                                            //console.log("found userToken table, then insert");

                                            //insert into password colloection
                                            //var myobj = JSON.parse(passwordKeyValue);

                                            // if there is already stored user's token then update for this new authenticationTocken in the DB
                                            dbo.collection("userToken").findOne({ name: namePassArray[0] }, { _id: 0 }, function (err, result) {
                                                // if this is the new user then insert 

                                                if (err) throw err;
                                                console.log("!!!previsous token: ");
                                                console.log(result);
                                                if (result == null) {
                                                    dbo.collection("userToken").insertOne(myobj, function (err, res) {
                                                        if (err) throw err;
                                                        console.log("Number of documents inserted: " + res.insertedCount);
                                                        //db.close();

                                                    });
                                                } else {
                                                    // update user's token in the table just changed for hw5
                                                    console.log("token exist for this user");

                                                    var myquery = { name: namePassArray[0] };
                                                    var newvalues = { $set: myobj };
                                                    dbo.collection("userToken").updateOne(myquery, newvalues, function (err, res) {
                                                        if (err) throw err;
                                                        console.log("new token update for that user ");

                                                        console.log("!!new token compare: " + hashedToken);
                                                        dbo.collection("userToken").findOne({ name: namePassArray[0] }, { _id: 0 }, function (err, result) {
                                                            if (err) throw err;
                                                            console.log("!!!now token: ");
                                                            console.log(result);

                                                        });
                                                    });

                                                }

                                                // test if the new token updated
                                                // console.log("!!new token compare: " + hashedToken);
                                                // dbo.collection("userToken").findOne({ name: namePassArray[0] }, { _id: 0 }, function (err, result) {
                                                //     if (err) throw err;
                                                //     console.log("!!!now token: ");
                                                //     console.log(result);
                                                // });

                                            });




                                        }
                                    }
                                    if (existFlag == false) {
                                        // create the userToken Collection table at here
                                        console.log("in usertoken first create")
                                        dbo.createCollection("userToken", function (err, res) {
                                            if (err) throw err;
                                            console.log("userToken Collection first created!");
                                            //db.close();

                                            // after create then insert
                                            //var myobj = JSON.parse(passwordKeyValue);
                                            dbo.collection("userToken").insertOne(myobj, function (err, res) {
                                                if (err) throw err;
                                                console.log("Number of documents inserted: " + res.insertedCount);
                                                //db.close();

                                            });
                                        });
                                    }

                                    // console.log("in 1620");
                                    // //insert username_socket hw6
                                    // username_socket.set(namePassArray[0], socket);


                                    // for (const [key, value] of username_socket.entries()) {
                                    //     console.log("in 1625");

                                    //     for (const [key1, value2] of username_socket.entries()) {

                                    //         var onlineusernameJSON = JSON.stringify({ 'onlineusername': key });

                                    //         value2.write(onlineusernameJSON);

                                    //     }

                                    // }

                                });
                                // redirect

                                socket.write(sendAuthenCookieResponse(completeHtml, "text/html", authenticationTocken));
                                //socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");

                            }
                        });




                    }

                    //----------------------------
                    else if (requestType === "GET" && requestPath === "/websocket") {
                        console.log("!!!---in webSocket");

                        //--------------------------

                        //-------------------------

                        clients.push(clientID);
                        clientSocket.push(socket);
                        var n = 0;
                        while (!lines[n].includes("Sec-WebSocket-Key")) {

                            n++;
                        }
                        var keyLine = lines[n];

                        //console.log("contentLenLine is：  "+contentLenLine);
                        const keyLinePart = keyLine.split(":");
                        const key = keyLinePart[1];
                        //console.log("boundaryPart is：  "+boundaryPart);

                        // boundary=  10 char
                        var justKey = key.substring(1);
                        //var justKey = 'a/HIf5gUZilyRVRvHs+RIg==';
                        //a/HIf5gUZilyRVRvHs+RIg==
                        //console.log("!!!--justKey: " + justKey);
                        var wholoKey = justKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

                        /*
                        var crypto = require('crypto');
                        var shasum = crypto.createHash('sha1');
                        //shasum.update(wholoKey);
                        shasum.update("Geek");
                        shasum.digest('hex');
                        //console.log("shasum type: " + Object.prototype.toString.call(shasum));
                        console.log("!!!---shasum: " + shasum);
                        */

                        const crypto = require('crypto'),

                            // Returns the names of supported hash algorithms 
                            // such as SHA1,MD5
                            //hash = crypto.getHashes();

                            // Create hash of SHA1 type
                            //x = "Geek"

                            // 'digest' is the output of hash function containing 
                            // only hexadecimal digits
                            hashPwd = crypto.createHash('sha1').update(wholoKey).digest('hex');

                        //console.log("!!!--- hash is: "+hashPwd); 
                        /*
                        var binary = '';
                        var bytes = new Uint8Array(shasum);
                        var len = bytes.byteLength;
                        for (var i = 0; i < len; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        window.btoa(binary);  */

                        //var bytes = new Uint8Array(shasum);
                        var base64String = Buffer.from(hashPwd, 'hex').toString('base64')

                        //console.log("!!!---base64: " + base64String); // print is correct for the Accept
                        //this tcp socket has upgraded to websocket connection
                        //isWebSocket.set(socket, "true");
                        //console.log("!!!---isWebSocket : " + isWebSocket.get(socket));
                        flag = true;
                        socket.write(sendWebsocketResponse(base64String));

                        //---hw4--Oject3---comment out for object 4--------------
                        /*
                        if (chatHistoryArray.length != 0) {

                            for (var i = 0; i < chatHistoryArray.length; i++) {
                                socket.write(chatHistoryArray[i]);
                            }
                        }  */

                        //---hw4 object4 mongo below for new user/tab start, retrieve chat history in the database---
                        // use mongo find method to retrieve data from certain table

                        dbo.listCollections().toArray(function (err, items) {
                            if (err) throw err;

                            // if mongo database exist
                            if (items.length == 0) {
                                console.log("!!!***No collections in database,create at here");

                                dbo.createCollection("customers", function (err, res) {
                                    if (err) throw err;
                                    console.log("Collection created!");
                                    //db.close();
                                });
                            }

                        });



                        // here we do not insert any record, just retrieve
                        /*
                        dbo.collection("customers").find({}).toArray(function (err, result) {
                            if (err) throw err;
                            console.log(result);
                            console.log("result.length: " + result.length);
                            for (var i = 0; i < result.length; i++) {
                                console.log("i: " + i);

                                //Convert a JavaScript object into a string
                                var jsonToString = JSON.stringify(result[i]);
                                var messageArrayRemove = Buffer.from(jsonToString);
                                
                                //  The first argument must be of type string or an instance of Buffer,
                                //    ArrayBuffer, or Array or an Array-like Object. Received an instance of Object
                                 
                                var sendFrameArray = [];
                                var firstByte = 129; //1000 0001
                                sendFrameArray.push(firstByte);
                                var messageArrayRemoveLen = messageArrayRemove.length;
                                if (messageArrayRemoveLen < 126) {

                                    sendFrameArray.push(messageArrayRemoveLen)
                                    //
                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(messageArrayRemove);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    // we are not doing broadcast, here is only display history for new user/user
                                    
                                    // for (var k = 0; k < clientSocket.length; k++) {
                                    //     clientSocket[k].write(newbuff);
                                    // }  
                                    socket.write(newbuff);


                                } else if (messageArrayRemoveLen >= 126) {

                                    sendFrameArray.push(126);
                                    console.log("messageArrayRemoveLen: " + messageArrayRemoveLen);
                                    console.log("messageArrayRemoveLen in Binary: " + messageArrayRemoveLen.toString(2));

                                    var mostOneByteBit = messageArrayRemoveLen & 65280;
                                    console.log("mostOneByteBit: " + mostOneByteBit.toString(2));
                                    var mostOneByteBitAfterShift = mostOneByteBit >> 8;

                                    var leastOneByteBit = messageArrayRemoveLen & 255;
                                    console.log("leastOneByteBit: " + leastOneByteBit.toString(2));
                                    sendFrameArray.push(mostOneByteBitAfterShift);
                                    sendFrameArray.push(leastOneByteBit);

                                    var buf1 = Buffer.from(sendFrameArray);
                                    var buf2 = Buffer.from(messageArrayRemove);
                                    var list = [buf1, buf2];
                                    var newbuff = Buffer.concat(list);

                                    socket.write(newbuff);

                                }

                            }
                            //db.close();
                        }); */
                        //--------hw4 mongo end-------------------

                        //-------hw6---------
                        console.log("in 1620");
                        //insert username_socket hw6

                        console.log("1826justSignInUser: " + justSignInUser);
                        username_socket.set(justSignInUser, socket);

                        for (const [key, value] of username_socket.entries()) {
                            console.log("in 1625");
                            console.log('key is: ' + key);
                            var sendFrameArray = [];
                            var onlineusernameJSON = JSON.stringify({ 'onlineusername': key });
                            console.log("1833: " + onlineusernameJSON);

                            const JSONsize = Buffer.byteLength(onlineusernameJSON);

                            console.log("1837 JSONsize: " + JSONsize)
                            //
                            var firstByte = 129;
                            sendFrameArray.push(firstByte);
                            sendFrameArray.push(JSONsize);

                            var buf1 = Buffer.from(sendFrameArray);
                            var buf2 = Buffer.from(onlineusernameJSON);
                            var list = [buf1, buf2];
                            var newbuff = Buffer.concat(list);
                            for (const [key1, value2] of username_socket.entries()) {
                                if (key1 != key) {
                                    console.log("value2" + value2);

                                    value2.write(newbuff);
                                }

                            }

                        }
                        //----------------
                    }

                    //------------------------

                    else if (requestType === "POST" && requestPath === "/image-upload") {
                        console.log("----N0.1 Post header parsing---");

                        //----------general parser place, all same for the /comment--
                        var n = 0;
                        while (!lines[n].includes("Content-Length")) {

                            n++;
                        }
                        var contentLenLine = lines[n];

                        //console.log("contentLenLine is：  "+contentLenLine);
                        const contentLenLinePart = contentLenLine.split(":");
                        const contentLenPart = contentLenLinePart[1];
                        //console.log("boundaryPart is：  "+boundaryPart);

                        // boundary=  10 char
                        var contentLen = contentLenPart.substring(1);
                        //console.log("contentLen is"+contentLen);
                        imageFormContentLength = parseInt(contentLen);
                        console.log("imageFormContentLength is: " + imageFormContentLength);


                        var k = 0;
                        while (!lines[k].includes("Content-Type")) {

                            k++;
                        }
                        var contentLine = lines[k];
                        //console.log("k is：  "+k);
                        //console.log("contentLine is：  "+contentLine);
                        const contentLinePart = contentLine.split(";");
                        const boundaryPart = contentLinePart[1];
                        //console.log("boundaryPart is：  "+boundaryPart);

                        // "boundary="   this string prefix is  10 char
                        var boundary = boundaryPart.substring(10);
                        //console.log("boundary is：  "+boundary);
                        imageBoundarySep = "--" + boundary;
                        console.log("boundarySep is :" + imageBoundarySep);

                        //convert boundarySep to byte
                        var boundarySepInBi = Buffer.from(imageBoundarySep, 'utf-8');
                        var boundarySepInBiLen = boundarySepInBi.length;
                        //console.log("!!boundarySepInBiLen is : " + boundarySepInBiLen);

                        //----until here we need to check, if body content =? content length 
                        var headerPartLength = headerPart.length;
                        ReadOfBodyLength = data.length - headerPartLength - 4; // this 4 is /r/n/r/n

                        bufferReadArray = data.slice(headerEndIndex + 4, data.length);
                        //console.log("!!first read bufferReadArray should be 0 is : " + bufferReadArray.length);
                        if (ReadOfBodyLength == imageFormContentLength) {
                            //parse and get the image content first.
                            // read all the data into file here and store into image folder file write

                            var imageStartBoundIndex = bufferReadArray.indexOf(boundarySepInBi);
                            //console.log("????imageStartBoundIndex is : " + imageStartBoundIndex);

                            var imageEndBoundIndex = bufferReadArray.indexOf(boundarySepInBi, imageStartBoundIndex + boundarySepInBiLen);
                            //console.log("????imageEndBoundIndex is : " + imageEndBoundIndex);

                            var crlf = Buffer.from("\r\n", 'utf-8');
                            var crlfLen = crlf.length;
                            var imagePart = bufferReadArray.slice(imageStartBoundIndex + boundarySepInBiLen + crlfLen, imageEndBoundIndex - crlfLen);

                            //-- get image binary content
                            var StartImageIndex = imagePart.indexOf(crlfcrlf);
                            //console.log("????crlfcrlf index at :" + StartImageIndex);
                            var imageBinaryContent = imagePart.slice(StartImageIndex + crlfcrlfLen, imagePart.length); // open interval for slice() no need -1

                            console.log("iamge size is: " + imageBinaryContent.length);

                            // store as image

                            const fs = require('fs');

                            imageNameConventionCount = imageNameConventionCount + 1;
                            //imageStoreName = 'new' + imageNameConventionCount.toString();
                            imageStorePath = 'image/new' + imageNameConventionCount.toString() + '.jpg';
                            console.log("&&& imageNameConventionCount: " + imageNameConventionCount);


                            fs.writeFile(imageStorePath, imageBinaryContent, 'binary', function (err) {
                                // throws an error, you could also catch it here
                                if (err) throw err;

                                // success case, the file was saved
                                console.log('\n image saved!');
                                //});

                                // parse caption

                                //get captionPart
                                var fileEndBoundIndex = bufferReadArray.indexOf(boundarySepInBi, imageEndBoundIndex + boundarySepInBiLen);
                                var captionPart = bufferReadArray.slice(imageEndBoundIndex + boundarySepInBiLen + crlfLen, fileEndBoundIndex - crlfLen);// cuz there /r/n infront of fileStartBoundIndex


                                //-- get user's caption in string
                                var StartCaptionIndex = captionPart.indexOf(crlfcrlf);
                                var captionInBinary = captionPart.slice(StartCaptionIndex + crlfcrlfLen, captionPart.length); // open interval for slice() no need -1
                                var captionInString = captionInBinary.toString('utf8');
                                console.log("captionInString is :" + captionInString);

                                //html injection var res = str.replace(/blue/g, "red");
                                var captionAfterReplace = captionInString.replace(/&/g, "&amp;");
                                captionAfterReplace = captionAfterReplace.replace(/</g, "&lt;");
                                captionAfterReplace = captionAfterReplace.replace(/>/g, "&gt;");


                                //imageCaptionArray.push([imageStoreName, captionAfterReplace]);
                                userMessageMapArray.push([imageStorePath, captionAfterReplace]);
                                // ["/NYCImage/Central_Park.jpg", "image/jpeg"]
                                var imagePathInMap = '/' + imageStorePath;
                                staticFiles.set(imagePathInMap, "image/jpeg");
                                flag = true;
                                console.log("finish ONLY in 1 Read");
                                socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");

                            });


                            flag = true;

                            socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");



                        }
                        else {
                            console.log("keep accumulate buffer");
                            flag = true;
                        }


                        //socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");


                    }

                    //=--------------------------------compare with comment working one 
                    else if (requestType === "POST" && requestPath === "/comment") {
                        console.log("in post");

                        var n = 0;
                        while (!lines[n].includes("Content-Length")) {

                            n++;
                        }
                        var contentLenLine = lines[n];

                        //console.log("contentLenLine is：  "+contentLenLine);
                        const contentLenLinePart = contentLenLine.split(":");
                        const contentLenPart = contentLenLinePart[1];
                        //console.log("boundaryPart is：  "+boundaryPart);

                        // boundary=  10 char
                        var contentLen = contentLenPart.substring(1);
                        //console.log("contentLen is"+contentLen);
                        var contenLength = parseInt(contentLen);
                        console.log("contenLength is" + contenLength);


                        var k = 0;
                        while (!lines[k].includes("Content-Type")) {

                            k++;
                        }
                        var contentLine = lines[k];
                        //console.log("k is：  "+k);
                        //console.log("contentLine is：  "+contentLine);
                        const contentLinePart = contentLine.split(";");
                        const boundaryPart = contentLinePart[1];
                        //console.log("boundaryPart is：  "+boundaryPart);

                        // "boundary="   this string prefix is  10 char
                        var boundary = boundaryPart.substring(10);
                        //console.log("boundary is：  "+boundary);
                        var boundarySep = "--" + boundary;
                        console.log("boundarySep is：  " + boundarySep);

                        //convert boundarySep to byte
                        var boundarySepInBi = Buffer.from(boundarySep, 'utf-8');
                        var boundarySepInBiLen = boundarySepInBi.length;

                        // ---------body part-- seperate by boundarySep byte format
                        //const bodyPart = data.slice(headerEndIndex + 4, data.length - 1);
                        const bodyPart = data.slice(headerEndIndex + 4, data.length);
                        const bodyPartInString = bodyPart.toString();

                        console.log("---body:" + bodyPartInString); // header is safe separeted now
                        console.log("-----print body end------\n\n");
                        //fileStartBoundIndex
                        var StartBoundIndex = bodyPart.indexOf(boundarySepInBi);
                        console.log("StartBoundIndex is :" + StartBoundIndex); // got 0 for index is corret
                        var fileStartBoundIndex = bodyPart.indexOf(boundarySepInBi, StartBoundIndex + boundarySepInBiLen);
                        console.log("fileStartBoundIndex is :" + fileStartBoundIndex);

                        var crlf = Buffer.from("\r\n", 'utf-8');
                        var crlfLen = crlf.length;
                        var namePart = bodyPart.slice(StartBoundIndex + boundarySepInBiLen + crlfLen, fileStartBoundIndex - crlfLen);// cuz there /r/n infront of fileStartBoundIndex
                        // "jessie/r/n"  also the "boundaryinString/r/n" that's why it jump to next line

                        const namePartInString = namePart.toString();
                        console.log("---namePart:" + namePartInString); // header is safe separeted now
                        console.log("-----print name Part end------");

                        //-- get name jessie in string  
                        var StartNameIndex = namePart.indexOf(crlfcrlf);
                        var commentorName = namePart.slice(StartNameIndex + crlfcrlfLen, namePart.length); // open interval for slice() no need -1
                        var commentorNameInString = commentorName.toString('utf8');
                        console.log("commentorNameInString is :" + commentorNameInString);

                        //get commentPart
                        var fileEndBoundIndex = bodyPart.indexOf(boundarySepInBi, fileStartBoundIndex + boundarySepInBiLen);
                        var commentPart = bodyPart.slice(fileStartBoundIndex + boundarySepInBiLen + crlfLen, fileEndBoundIndex - crlfLen);// cuz there /r/n infront of fileStartBoundIndex
                        // "jessie/r/n"  also the "boundaryinString/r/n" that's why it jump to next line

                        //const commentPartInString=commentPart.toString('utf8');
                        //console.log("---commentPartInString:"+commentPartInString); // header is safe separeted now
                        //console.log("-----print comment Part end------");

                        //-- get user's comment in string  
                        var StartCommentIndex = commentPart.indexOf(crlfcrlf);
                        var commentInBinary = commentPart.slice(StartCommentIndex + crlfcrlfLen, commentPart.length); // open interval for slice() no need -1
                        var commnetInString = commentInBinary.toString('utf8');
                        console.log("commnetInString is :" + commnetInString);

                        //html injection var res = str.replace(/blue/g, "red");
                        var commentAfterReplace = commnetInString.replace(/&/g, "&amp;");
                        commentAfterReplace = commentAfterReplace.replace(/</g, "&lt;");
                        commentAfterReplace = commentAfterReplace.replace(/>/g, "&gt;");
                        // integrate together
                        //Thank you {{name}} for your comment of {{comment}}.
                        // commentorNameInString  & commentAfterReplace



                        // put submission username and commnet into the map
                        //userMessageMap.set(commentorNameInString, commentAfterReplace);
                        userMessageMapArray.push([commentorNameInString, commentAfterReplace]);
                        //userMessageMapArray.push({ name: commentorNameInString, comment: commentAfterReplace });
                        //userMessageMapArray.push({ [commentorNameInString]: commentAfterReplace });

                        //userMessageMapArray.push({ commentorNameInString: commentAfterReplace });
                        //var obj = {};
                        //obj[commentorNameInString] = commentAfterReplace;
                        //userMessageMapArray.push(obj);


                        console.log("---------------userMessageMapArray-------:" + userMessageMapArray);
                        //userMessageMapObject.commentorNameInString = commentAfterReplace;
                        //userMessageMapObject[commentorNameInString] = commentAfterReplace;
                        socket.write("HTTP/1.1 301 Moved Permanently\r\nLocation: /\r\n\r\n");
                    }

                    //--------------HW3  above -------------------------------------------


                    // to request css and image using this 
                    else if (requestType === "GET" && staticFiles.has(requestPath)) {

                        var res = requestPath.substring(1);

                        var fs = require("fs");
                        //var data=fs.readFileSync('image/kitten.jpg'); //this line works now is 24063

                        // fs.readFile('image/kitten.jpg', function(err, data) {      
                        //  console.log(data);
                        // });   here is 693

                        if (staticFiles.get(requestPath) == "image/jpeg") {
                            var data = fs.readFileSync(res);
                            socket.write(sendBinaryResponse(data, staticFiles.get(requestPath)));
                        } else {

                            var data = fs.readFileSync(res, 'utf-8');
                            socket.write(sendTextResponse(data, staticFiles.get(requestPath)));
                        }


                    }

                    // object 4 JQuery
                    else if (requestType === "GET" && requestPath.substring(0, 8) === "/images?") {//requestPath start with / end at ? which is index 7,
                        //console.log("In Object 4");
                        var text = "";
                        var userName = "";
                        var rest = requestPath.substring(8);// means include index 8 to the last index element
                        //     78
                        // "/images?images=cat+kitten+dog&name=Mitch"
                        if (rest.substring(0, 7) === "images=") {
                            var imageFirst = rest.substring(7); // cat+kitten+dog&name=Mitch
                            //console.log("imageFirst:  "+ imageFirst);
                            for (let i = 0; i < imageFirst.length; i++) {
                                if (imageFirst[i] == '&' || i == imageFirst.length - 1) {
                                    //console.log("i: "+i);
                                    if (i == imageFirst.length - 1) {
                                        userName = "";
                                        imageQuery = imageFirst.substring(0, imageFirst.length);

                                    } else if (i < imageFirst.length - 1) {
                                        userName = imageFirst.substring(i + 6);    // &name= there is 5 char after &   
                                        imageQuery = imageFirst.substring(0, i);

                                    }
                                    // userName = imageFirst.substring(i + 6);    // &name= there is 5 char after &   
                                    // imageQuery = imageFirst.substring(0, i);
                                    // now we start to split imageQuery with +
                                    imageList = imageQuery.split("+");
                                    //console.log("imageList: "+imageList); //cat,kitten,dog


                                    //console.log("imageList.length: "+imageList.length);
                                    var k;

                                    for (k = 0; k < imageList.length; k++) {
                                        text += '<h6><img src="image/' + imageList[k] + '.jpg" /><h6/>';
                                    }
                                    break;
                                    //console.log("text: "+ text);

                                }
                            }



                        }

                        //“name=Mitch&images=cat+kitten+dog”

                        //------------

                        else if (rest.substring(0, 5) === "name=") {
                            var nameFirst = rest.substring(5); // Mitch&images=cat+kitten+dog

                            //console.log("nameFirst:  "+ nameFirst);
                            for (let i = 0; i < nameFirst.length; i++) {
                                if (nameFirst[i] == '&' || i == nameFirst.length - 1) {
                                    //console.log("i: "+i);

                                    if (i == nameFirst.length - 1) {
                                        imageQuery = "";
                                        userName = nameFirst.substring(0, nameFirst.length);

                                    } else if (i < nameFirst.length - 1) {
                                        userName = nameFirst.substring(0, i);
                                        imageQuery = nameFirst.substring(i + 8);
                                    }

                                    //----------------
                                    //userName = nameFirst.substring(0, i);      // i
                                    //imageQuery = nameFirst.substring(i + 8);        // &images=cat+kitten+dog  

                                    console.log("imageQuery" + imageQuery);
                                    // now we start to split imageQuery with +
                                    imageList = imageQuery.split("+");
                                    console.log("imageList: " + imageList); //cat,kitten,dog


                                    console.log("imageList.length: " + imageList.length);
                                    if (imageList.length == 1) {
                                        imageList.length = 0;
                                    }
                                    var k;

                                    for (k = 0; k < imageList.length; k++) {
                                        text += '<h6><img src="image/' + imageList[k] + '.jpg" /><h6/>';
                                    }

                                    //console.log("text: "+ text);
                                    break;
                                }

                            }
                        }
                        // parse the requestPath here to get the username and requestImage
                        // look for + & name images=
                        //console.log("username:  " + userName);


                        let replacePlaceHolder = new Map([
                            ["title", "Choose Your Favorite Animal"],
                            ["description", "Welcoming  " + userName + "!"],
                            ["loop", ""],
                            ["content_from_data_structure", text],
                            ["end_loop", ""]
                        ]);

                        //console.log("replacePlaceHolder: "+replacePlaceHolder);

                        var completeHtml = renderTemplate("public/basicTemplate.html", replacePlaceHolder);
                        // the return value from renderTemplate should be string
                        //console.log("completeHtml type: " + Object.prototype.toString.call(completeHtml));

                        // here completeHtml should be string which is the body content send in the response
                        socket.write(sendTextResponse(completeHtml, "text/html"));
                    }

                    //else if (flag == false) {  //this is work upto hw4
                    else {// changed for hw5 
                        console.log("!!!!!In 404");
                        socket.write(buildNotFoundResponse("text/plain", "404 The content was not found here"));
                    }
                }

            }

        })
    }).listen({ host: "0.0.0.0", port: 80 });

});


function buildNotFoundResponse(mimeType, content) {

    return buildResponse("404 Not Found", mimeType, content);
}
//socket.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\nhello");

function buildResponse(responseCode, mimeType, content) { // lecture 10;46:18 js 

    const encodedContent = Buffer.from(content, 'utf8');
    var response = "";
    // debug Tips: there have to has space after "1.1 " not "1.1", cuz the client which is the browser parse the post from what we sent to him split with " " space!!
    response += "HTTP/1.1 " + responseCode + "\r\n";
    response += "Content-Type: " + mimeType + "; charset=utf-8\r\n";
    response += "X-Content-Type-Options: nosniff\r\n";
    response += "Content-Length: " + Buffer.byteLength(content, 'utf8');// 

    response += "\r\n\r\n";

    return Buffer.from(response) + Buffer.from(content, 'utf8');
}

function sendBinaryResponse(body, contentType) {
    var response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + contentType + "\r\n";
    response += "X-Content-Type-Options: nosniff\r\n";
    response += "Content-Length: " + body.length + "\r\n\r\n";// here image is not string anymore
    //console.log("body length is "+body.length);

    //console.log("response type is "+Object.prototype.toString.call(Buffer.from(response)));
    //console.log("body type is "+Object.prototype.toString.call(body));
    //console.log("combine type is " + Object.prototype.toString.call(Buffer.from(response) + body));

    var a = Buffer.from(response);
    var b = body;
    var c = new Uint8Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    //console.log("c type is " + Object.prototype.toString.call(c));
    return c;
    //return Buffer.from(response) + body;  
}
function sendTextResponse(body, contentType) {
    var response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + contentType + "; charset=utf-8\r\n";
    response += "X-Content-Type-Options: nosniff\r\n";
    response += "Content-Length: " + Buffer.byteLength(body, 'utf8');//
    response += "\r\n\r\n";

    return Buffer.from(response) + Buffer.from(body, 'utf8');
    //return Buffer.from(response) + body;
}
function sendCookieResponse(body, contentType) {
    var response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + contentType + "; charset=utf-8\r\n";
    response += "X-Content-Type-Options: nosniff\r\n";
    // hw5 Set Cookie
    response += "Set-Cookie: firtTimeVist=X6kAwpgW29M\r\n";
    response += "Content-Length: " + Buffer.byteLength(body, 'utf8');//
    response += "\r\n\r\n";

    return Buffer.from(response) + Buffer.from(body, 'utf8');
    //return Buffer.from(response) + body;
}
function sendAuthenCookieResponse(body, contentType, authenticationTocken) {
    var response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + contentType + "; charset=utf-8\r\n";
    response += "X-Content-Type-Options: nosniff\r\n";

    // hw5 Set Authentication Cookie
    //response += "Set-Cookie: Authentication=" + authenticationTocken + "\r\n";// works before set session
    response += "Set-Cookie: Authentication=" + authenticationTocken + "; max-age=86400000" + "\r\n";//60*60*24*30 1 months expire

    response += "Content-Length: " + Buffer.byteLength(body, 'utf8');//
    response += "\r\n\r\n";

    return Buffer.from(response) + Buffer.from(body, 'utf8');
    //return Buffer.from(response) + body;
}
function sendWebsocketResponse(key) {
    /*
    HTTP/1.1 101 Switching Protocols\r\n
    Upgrade: websocket\r\n
    Connection: Upgrade\r\n
    Sec-WebSocket-Accept: gK1jd/ZRFUGzHZJdrwFDaU9LO04=\r\n
    */
    var response = "HTTP/1.1 101 Switching Protocols\r\n";
    response += "Upgrade: websocket\r\n";
    response += "Connection: Upgrade\r\n";
    response += "Sec-WebSocket-Accept: " + key;
    response += "\r\n\r\n";

    return Buffer.from(response);

}

function renderTemplate(templateFilename, data) {


    const fs = require('fs');

    var content = fs.readFileSync(templateFilename, 'utf-8');
    // should read as string
    //console.log("content type: " + Object.prototype.toString.call(content));

    // To replace our placeholder in the HtmlTemplate
    // this data is what we construct with client's request, line 83 that map() part
    for (const [key, value] of data.entries()) {

        //console.log(key, value);
        content = content.replace("{{" + key + "}}", value);
    }
    /*
    var completeHtml = renderTemplate("basicTemplate.html",Map(
                    ["title",                       "Choose Your Favorite Animal"],
                    ["description",                 "Welcoming"+ username],
                    ["loop",                        ""],
                    ["content_from_data_structure", scrImageList],
                    ["end_loop",                    ""]         
                    ));
    */

    //<img src="image/flamingo.jpg" alt="It's a flamingo" class="my_image"/>
    // <img src="put image name in here"/>
    /*
    var cars = ["BMW", "Volvo", "Saab", "Ford", "Fiat", "Audi"];
    var text = "";
    var i;
    for (i = 0; i < cars.length; i++) {
      text += "<h6><img src="+ cars[i] + "/><h6/>";
    }
    */
    return content
}

function parsePassword(lines, data, headerEndIndex, crlfcrlf, crlfcrlfLen) {

    var n = 0;
    // while (!lines[n].includes("Content-Length")) {

    //     n++;
    // } // includes undefined? in Firfox
    for (; n < lines.length; n++) {
        if (lines[n].substring(0, 14) == "Content-Length") {
            break;
        }
    }
    var contentLenLine = lines[n];
    console.log("n: " + n);


    //console.log("contentLenLine is：  "+contentLenLine);
    const contentLenLinePart = contentLenLine.split(":");
    const contentLenPart = contentLenLinePart[1];
    //console.log("boundaryPart is：  "+boundaryPart);

    // boundary=  10 char
    var contentLen = contentLenPart.substring(1);
    //console.log("contentLen is"+contentLen);
    var contenLength = parseInt(contentLen);
    console.log("contenLength is" + contenLength);


    var k = 0;
    while (!lines[k].includes("Content-Type")) {

        k++;
    }
    var contentLine = lines[k];
    //console.log("k is：  "+k);
    //console.log("contentLine is：  "+contentLine);
    const contentLinePart = contentLine.split(";");
    const boundaryPart = contentLinePart[1];
    //console.log("boundaryPart is：  "+boundaryPart);

    // "boundary="   this string prefix is  10 char
    var boundary = boundaryPart.substring(10);
    //console.log("boundary is：  "+boundary);
    var boundarySep = "--" + boundary;
    console.log("boundarySep is：  " + boundarySep);

    //convert boundarySep to byte
    var boundarySepInBi = Buffer.from(boundarySep, 'utf-8');
    var boundarySepInBiLen = boundarySepInBi.length;

    // ---------body part-- seperate by boundarySep byte format
    //const bodyPart = data.slice(headerEndIndex + 4, data.length - 1);
    const bodyPart = data.slice(headerEndIndex + 4, data.length);
    const bodyPartInString = bodyPart.toString();

    console.log("---body:" + bodyPartInString); // header is safe separeted now
    console.log("-----print body end------\n\n");
    //fileStartBoundIndex
    var StartBoundIndex = bodyPart.indexOf(boundarySepInBi);
    console.log("StartBoundIndex is :" + StartBoundIndex); // got 0 for index is corret
    var fileStartBoundIndex = bodyPart.indexOf(boundarySepInBi, StartBoundIndex + boundarySepInBiLen);
    console.log("fileStartBoundIndex is :" + fileStartBoundIndex);

    var crlf = Buffer.from("\r\n", 'utf-8');
    var crlfLen = crlf.length;
    var namePart = bodyPart.slice(StartBoundIndex + boundarySepInBiLen + crlfLen, fileStartBoundIndex - crlfLen);// cuz there /r/n infront of fileStartBoundIndex
    // "jessie/r/n"  also the "boundaryinString/r/n" that's why it jump to next line

    const namePartInString = namePart.toString();
    console.log("---namePart:" + namePartInString); // header is safe separeted now
    console.log("-----print name Part end------");

    //-- get name jessie in string  
    var StartNameIndex = namePart.indexOf(crlfcrlf);
    var commentorName = namePart.slice(StartNameIndex + crlfcrlfLen, namePart.length); // open interval for slice() no need -1
    var commentorNameInString = commentorName.toString('utf8');
    console.log("commentorNameInString is :" + commentorNameInString);

    //get commentPart
    var fileEndBoundIndex = bodyPart.indexOf(boundarySepInBi, fileStartBoundIndex + boundarySepInBiLen);
    var commentPart = bodyPart.slice(fileStartBoundIndex + boundarySepInBiLen + crlfLen, fileEndBoundIndex - crlfLen);// cuz there /r/n infront of fileStartBoundIndex
    // "jessie/r/n"  also the "boundaryinString/r/n" that's why it jump to next line



    //-- get user's password in string  
    var StartCommentIndex = commentPart.indexOf(crlfcrlf);
    var commentInBinary = commentPart.slice(StartCommentIndex + crlfcrlfLen, commentPart.length); // open interval for slice() no need -1
    var commnetInString = commentInBinary.toString('utf8');
    console.log("Password is :" + commnetInString);
    var namePassword = [];
    namePassword.push(commentorNameInString);
    namePassword.push(commnetInString);
    return namePassword;
}
