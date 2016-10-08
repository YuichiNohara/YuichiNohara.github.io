// MLS_02.js   by YUICHI NOHARA
// WebRTCで画面共有、ステレオオーディオ共有とMIDIの通信を実現する

////////////////////////////////////////////////////////////////////////////////
//　Web RTC
////////////////////////////////////////////////////////////////////////////////

var connectedCall;		// Media Stream用, callオブジェクトの保存変数.
var conn;				// RTC Data Channel用, connectionオブジェクトの保存変数.
var myStream1;			// myのステレオオーディオストリームの保存変数.
var myStream2;			// myのスクリーンキャプチャーストリームの保存変数.
var myStream3;			// myのカメラストリームの保存変数.
// var peerStream1;		// Peerのスクリーンキャプチャーとステレオオーディオストリームの保存変数.
// var peerStream3;		// Peerのカメラストリームの保存変数.
var recStream1;			// Recordするmyのステレオオーディオストリームの保存変数.
var recStream2;			// Recordするmyの音声ストリームの保存変数.
var recStream3;			// Recordするpeerのステレオオーディオストリームの保存変数.
var recStream4;			// Recordするpeerの音声ストリームの保存変数.
var recorder =  null;		// MediaRecorderオブジェクトの保存変数.
var recordedBlobs;		// MediaRecorderの録音データの保存変数.

// SkyWayのシグナリングサーバへ接続する
peerId = String(Math.floor(Math.random() * 9000) + 1000);		// 1000から9999の乱数を生成
var options = { key: '6e67140f-5908-4026-a31b-ccb1e94d38c5' };	// APIキー情報
peer = new Peer(peerId, options);						// Peerを開始しLISTEN状態にする

// シグナリングサーバへの接続が確立時に, myのIDを表示する.
peer.on('open', function() {$("#my-id").text(peer.id);});

// Peerから接続要求が来た場合の動作 (Media Stream).
peer.on("call", function(call){
	// callオブジェクトを保存する.
	connectedCall = call;
	// 接続できた場合は,  PeerのIDを表示する.
	$("#peer-id").text(call.peer);
	// Connectの通知
	$("#messages").append($("<p>").html (call.peer + "とConnectしました. "));

	// myMultiTrackStreamにmyStream1-3を追加し, peerに渡す.	
	var myMultiTrackStream = new webkitMediaStream();
	myMultiTrackStream.addTrack(myStream1.getAudioTracks()[0]);
	myMultiTrackStream.addTrack(myStream2.getVideoTracks()[0]);
	myMultiTrackStream.addTrack(myStream3.getAudioTracks()[0]);
	myMultiTrackStream.addTrack(myStream3.getVideoTracks()[0]);
	call.answer(myMultiTrackStream);

	// peerからストリームが渡された場合の処理.
	call.on("stream", function(peerMultiTrackStream){
		// peerのtrackを表示させるためのストリームを作り, それを表示する.
		var videotracks = peerMultiTrackStream.getVideoTracks();
		var audiotracks = peerMultiTrackStream.getAudioTracks();
		var peerStream1 = new webkitMediaStream();
		var peerStream2 = new webkitMediaStream();
		var peerStream3 = new webkitMediaStream();
		var peerStream4 = new webkitMediaStream();
		peerStream1.addTrack(videotracks[0]);
		peerStream1.addTrack(audiotracks[0]);
		peerStream2.addTrack(audiotracks[0]);
		peerStream3.addTrack(videotracks[1]);
		peerStream3.addTrack(audiotracks[1]);
		peerStream4.addTrack(audiotracks[1]);		
		audioElement.srcObject = peerStream1;
		voiceElement.srcObject = peerStream3;
//		$("#peer-screen").prop("src", URL.createObjectURL(peerStream1));
//		$("#peer-video").prop("src", URL.createObjectURL(peerStream3));	
		// peerを録音するためのストリームを作る.
		recStream3 = peerStream2;
		recStream4 = peerStream4;
	});
});

// Peerから接続要求が来た場合の動作 (RTC Data Channel).
peer.on("connection", function(connection){
	// connectionオブジェクトを保存する.
	conn = connection;
	// メッセージ受信イベントを設定する.
	conn.on("data", onRecvMessage);
});

// MIDIデータ送信時の動作
window.addEventListener("midiin-event:midi-input", function(event){
	var output=document.getElementById("midi-output");
    	// MIDIデータをPeerとMIDI outに送信する.
	if (conn) {
		var data = {midi: event.detail.data};
		conn.send(data)}; 
	if(output.checkOutputIdx()!="false") {output.sendRawMessage(event.detail.data)};
})

// 受信イベントの設定
function onRecvMessage(data) {	
	// Midi out に受信したMIDIメッセージを送信する.
	var output=document.getElementById("midi-output");
	if(data.midi) {
		if (output.checkOutputIdx()!="false"){
			output.sendRawMessage(new Uint8Array(data.midi));
		};
	};
	// 画面に受信したメッセージを表示する.
	if(data.msg) {
		$("#messages").append($("<p>").text("Peer : " + data.msg).css("font-weight", "bold"));
	};
	// 画面に受信したファイルのリンクを表示する.	
	if(data.file) {
		var url = URL.createObjectURL(new Blob([data.file]));
		var name = decodeURIComponent(data.name);
		$("#messages").append($("<p>").html("Peer : ファイルを送信しました. " + 
		'<a href="' + url + '" target="_blank" download="' + name + '">' + name + '</a>').css("font-weight", "bold"));
	};
}

// DOM要素の構築が終わった場合に呼ばれるイベント
$(function() {
	// オーディオのストリームを取得する.
	stereoAudio();
	// スクリーンのストリームを取得する.
	var screenshare = new SkyWay.ScreenShare({debug: false});
	screenshare.startScreenShare({
			Width: 960, 
			Height: 540, 
			FrameRate: 30
		},function (stream) { myStream2 = stream;
		},function (error) { alert("Error!");
		},function() { alert("ScreenShareを終了しました");
		}
	);

	// カメラのストリームを取得する.
 	camera();
	
	// connectボタンクリック時の動作
	$("#connect").click(function(){
		// peerのIDを取得しconnectする.
		var peer_id = $("#peer-id-input").val();
		conn = peer.connect(peer_id);
        	// メッセージ受信イベントを設定する.
		conn.on("data", onRecvMessage);

		// myMultiTrackStreamにmyStream1-3を追加し, peerに渡す.
		var myMultiTrackStream = new webkitMediaStream();
		myMultiTrackStream.addTrack(myStream1.getAudioTracks()[0]);
		myMultiTrackStream.addTrack(myStream2.getVideoTracks()[0]);
		myMultiTrackStream.addTrack(myStream3.getAudioTracks()[0]);
		myMultiTrackStream.addTrack(myStream3.getVideoTracks()[0]);
		var call = peer.call(peer_id, myMultiTrackStream);

		// callオブジェクトを保存する.
		connectedCall = call;
		// Peerからストリームが渡された場合の処理.
		call.on("stream", function(peerMultiTrackStream){
			// PeerのIDを表示する
			$("#peer-id").text(call.peer);
			// Connectの通知	
			$("#messages").append($("<p>").html (peer_id + "とConnectしました. "));

			// peerのtrackを表示させるためのストリームを作り, それを表示する.
			var videotracks = peerMultiTrackStream.getVideoTracks();
			var audiotracks = peerMultiTrackStream.getAudioTracks();
			var peerStream1 = new webkitMediaStream();
			var peerStream2 = new webkitMediaStream();
			var peerStream3 = new webkitMediaStream();
			var peerStream4 = new webkitMediaStream();
			peerStream1.addTrack(videotracks[0]);
			peerStream1.addTrack(audiotracks[0]);
			peerStream2.addTrack(audiotracks[0]);
			peerStream3.addTrack(videotracks[1]);
			peerStream3.addTrack(audiotracks[1]);
			peerStream4.addTrack(audiotracks[1]);			
			audioElement.srcObject = peerStream1;
			voiceElement.srcObject = peerStream3;
//			$("#peer-screen").prop("src", URL.createObjectURL(peerStream1));
//			$("#peer-video").prop("src", URL.createObjectURL(peerStream3));	
			// peerを録音するためのストリームを作る.
			recStream3 = peerStream2;
			recStream4 = peerStream4;
		});
	});

	// Sendボタンクリック時の動作 (メッセージ送信)
	$("#send").click(function() {
		if(conn) {
			// メッセージを取得する.
			var message = $("#message").val();
			var data = {msg: message};
			// メッセージを送信する.
			conn.send(data);
			// 画面に送信したメッセージを表示する.
			$("#messages").append($("<p>").html("My : " + message));
			// メッセージ入力ボックスをクリアする.
			$("#message").val("");
		};
	});

	// ファイル選択後の動作 (ファイル送信)
	$("#file").change(function(ev) {
		if(conn) {
			// FileListオブジェクトを取得する.
			var files = ev.target.files;	
			// 最初のファイルを取得する.
			var file = files[0];
			// FileReaderを作る.
			var reader = new FileReader();
			// ファイルの読み取り終了後, ファイルを送信する.
			reader.onload = function(e) {
				var data = {file: reader.result, name: encodeURIComponent(file.name)};
				conn.send(data); 
				};
			// 画面に送信したファイル名を表示する.
			$("#messages").append($("<p>").html("My : ファイルを送信しました. " + file.name));
			// ファイルの読み取りを行う. 	
			reader.readAsArrayBuffer(file);
		};
		// ファイル選択ボックスをクリアする.
		$("#file").val("");
	});

	// ログ選択後の動作 (ログファイル出力)
	$("#log").click(function() {
		// 画面にログファイルのリンクを表示する.	
		var url = URL.createObjectURL(new Blob([messages.innerText], {type: "text/plain"}));
		var name = "logfile.txt";
		$("#messages").append($("<p>").html("ログファイルを作成しました. " + 
		'<a href="' + url + '" target="_blank" download="' + name + '">' + name + '</a>'));
	});

	// StartRecord選択後の動作 (録音開始).
	$("#start-record").click(function() {
 		recordedBlobs = [];

		// 録音するストリームのミキシング
 		context = new AudioContext();	
		var output = context.createMediaStreamDestination();
		if (recStream1) {
			var source1 = context.createMediaStreamSource(recStream1);
			source1.connect(output);
		};
		if (recStream2) {
	 		var source2 = context.createMediaStreamSource(recStream2);
			source2.connect(output);
		};
		if (recStream3) {
			var source3 = context.createMediaStreamSource(recStream3);
			source3.connect(output);
		};
		if (recStream4) {
			var source4 = context.createMediaStreamSource(recStream4);
			source4.connect(output);
		};
		var recStream = output.stream;
  
 		// 録音するストリームがない場合には処理しない.
 		if (! recStream) {
			$("#messages").append($("<p>").html ("録音するストリームがありません. "));
 			return; 
 		};
		// 録音を開始している場合には処理しない,
		if (recorder) {
			$("#messages").append($("<p>").html ("すでに録音開始しています. "));
			return;
		};
		// MediaRecorderを作る.
		recorder = new MediaRecorder(recStream);
		// 録音データを保存する.
		recorder.ondataavailable = function(evt) {
			if (evt.data && evt.data.size > 0) {
				recordedBlobs.push(evt.data);
			};
		};
		// 録音の開始.
 		recorder.start();
		$("#messages").append($("<p>").html ("録音を開始しました. "));
	});
			
	// StopRecord選択後の動作 (録音停止).
	$("#stop-record").click(function() {
		// 録音を開始していない場合には処理しない.
		if (! recorder) {
			$("#messages").append($("<p>").html ("録音開始せずに, 録音停止しました. "));
			return;
		};
		// 録音の停止.
		recorder.stop();
		recorder =  null;
		// 画面に録音ファイルのリンクを表示する.	
		var url = URL.createObjectURL (new Blob (recordedBlobs, {type: "audio/ogg"}));
 		var name = "recorded.webm";
		$("#messages").append($("<p>").html("録音を停止し, 録音ファイルを作成しました. " + 
		'<a href="' + url + '" target="_blank" download="' + name + '">' + name + '</a>'));
 	});

	// "L" ボタンクリック時の動作 (PeerID表示).
	$("#list").click(function() {
		peer.listAllPeers(function(list){
			$("#messages").append($("<p>").html("アクティブな ID です. ")); 
			for(var cnt = 0;cnt < list.length;cnt++){
				$("#messages").append($("<p>").html(list[cnt]));
			};
		});
	});

	// closeボタンクリック時の動作 (切断).
	$("#close").click(function() {
		connectedCall.close();
		conn.close();
	});
});

////////////////////////////////////////////////////////////////////////////////
//   Select Audio  & Video Device 
////////////////////////////////////////////////////////////////////////////////

var audioElement = document.getElementById("peer-screen")
var voiceElement = document.getElementById("peer-video")
var audioSelect = document.querySelector("select#audioSource");
var voiceSelect = document.querySelector("select#voiceSource");
var videoSelect = document.querySelector("select#videoSource");
var audioOutSelect = document.querySelector("select#audioOutSource");
var voiceOutSelect = document.querySelector("select#voiceOutSource");
var selectors = [audioSelect, voiceSelect, videoSelect, audioOutSelect, voiceOutSelect];

// AudioとVideoのInputデバイスの配列作成とリスト表示と選択時の処理.
function gotDevices(deviceInfos) {
	// Handles being called several times to update labels. Preserve values.
	var values = selectors.map(function(select) {return select.value;});
	selectors.forEach(function(select) {
		while (select.firstChild) {select.removeChild(select.firstChild);}
	});

	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		var option = document.createElement("option");
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === "audioinput") {
			option.text = deviceInfo.label || voiceSelect.length + 1;
			voiceSelect.appendChild(option);
		} else if (deviceInfo.kind === "videoinput") {
			option.text = deviceInfo.label || videoSelect.length + 1;
			videoSelect.appendChild(option);
		} else if (deviceInfo.kind === 'audiooutput') {
			option.text = deviceInfo.label || voiceOutSelect.length + 1;
			voiceOutSelect.appendChild(option); 
		}; 
	};
//	selectors.forEach(function(select, selectorIndex) {
//		if (Array.prototype.slice.call(select.childNodes).some(function(n) {
//			return n.value === values[selectorIndex];
//		})) {select.value = values[selectorIndex];}
//	});
//
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		var option = document.createElement("option");
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === "audioinput") {
			option.text = deviceInfo.label || audioSelect.length + 1;
			audioSelect.appendChild(option);
		} else if (deviceInfo.kind === 'audiooutput') {
			option.text = deviceInfo.label || audioOutSelect.length + 1;
			audioOutSelect.appendChild(option); 
		}; 
	};
	selectors.forEach(function(select, selectorIndex) {
		if (Array.prototype.slice.call(select.childNodes).some(function(n) {
			return n.value === values[selectorIndex];
		})) {select.value = values[selectorIndex];}
	});
	console.log (selectors);
}

navigator.mediaDevices.enumerateDevices()
.then(gotDevices)
.catch(errorCallback);

// デバイスの sink ID を使ってvideo elementにオーディオの出力デバイスを引き当てる.
function changeAudioDestination() {
	var sinkId = audioOutSelect.value;
		if (typeof audioElement.sinkId !== 'undefined') {
		audioElement.setSinkId(sinkId)
		.then(function() {
			console.log ('Success, audio output device attached: ' + sinkId);
			console.log (audioElement.sinkId, voiceElement.sinkId);
//			voiceElement.setSinkId(voiceOutSelect.value);
		})
		.catch(function(error) {
			var errorMessage = error;
			if (error.name === 'SecurityError') {
				errorMessage = 'You need to use HTTPS for selecting audio output ' + 'device: ' + error;
				}
				console.error(errorMessage);
				// Jump back to first output device in the list as it's the default.
				audioOutSelect.selectedIndex = 0;
			});
		} else {console.warn('Browser does not support output device selection.');
	}
}

function changeVoiceDestination() {
	var sinkId = voiceOutSelect.value;	
		if (typeof voiceElement.sinkId !== 'undefined') {
		voiceElement.setSinkId(sinkId)
		.then(function() {
			console.log ('Success, audio output device attached: ' + sinkId);
			console.log (audioElement.sinkId, voiceElement.sinkId);
//			audioElement.setSinkId(audioOutSelect.value);
		})
		.catch(function(error) {
			var errorMessage = error;
			if (error.name === 'SecurityError') {
				errorMessage = 'You need to use HTTPS for selecting audio output ' + 'device: ' + error;
				}
				console.error(errorMessage);
				// Jump back to first output device in the list as it's the default.
				voiceOutSelect.selectedIndex = 0;
			});
		} else {console.warn('Browser does not support output device selection.');
	}
}

function errorCallback(error) {console.log("navigator.getUserMedia error: ", error);}

// オーディオのストリームを取得する.
function stereoAudio() {
	if (window.stream) {window.stream.getTracks().forEach(function(track) {track.stop();});}

	var audioSource = audioSelect.value;
	var constraints = {
		audio: {deviceId: audioSource ? {exact: audioSource} : undefined, 
			echoCancellation: false, 
			googEchoCancellation: false,
			googEchoCancellation2: false,
			googAutoGainControl: false,
			googAutoGainControl2: false,
			googNoiseSuppression: false,
			googNoiseSuppression2: false,
			googHighpassFilter: false,
			googTypingNoiseDetection: false
		},
		video: false
	};

	navigator.mediaDevices.getUserMedia(constraints)
		.then(function(stream) {
			// 送信に使うため保存する.
			myStream1 = stream;
			// 録音に使うため保存する.
			recStream1 = stream;
			// デバイス配列をリフレッシュする.
			return navigator.mediaDevices.enumerateDevices();
	})
	.then(gotDevices)
	.catch(errorCallback);
}

// カメラのストリームを取得する.
function camera() {
	if (window.stream) {window.stream.getTracks().forEach(function(track) {track.stop();});}

	var voiceSource = voiceSelect.value;
	var videoSource = videoSelect.value;
	var constraints = {
		audio: {deviceId: voiceSource ? {exact: voiceSource} : undefined,
			echoCancellation: false, 
			googEchoCancellation: true,
			googEchoCancellation2: false,
			googAutoGainControl: false,
			googAutoGainControl2: true,
			googNoiseSuppression: false,
			googNoiseSuppression2: true,
			googHighpassFilter: true,
			googTypingNoiseDetection: false
		},
		video: {deviceId: videoSource ? {exact: videoSource} : undefined,
			Width: 640, 
			Height: 480, 
			FrameRate: 30
		}
	};

	navigator.mediaDevices.getUserMedia(constraints)
		.then(function(stream) {
			// 送信に使うため保存する.
			myStream3 = stream;
			// 録音に使うため保存する.
			var audiotracks = stream.getAudioTracks();
			recStream2 = new webkitMediaStream();
			recStream2.addTrack(audiotracks[0]);
			// My Cameraに表示する.
//			$("#play-audio").prop("src", URL.createObjectURL(recStream2));
			voiceElement.srcObject = recStream2;
			console.log(voiceElement.srcObject);
			// デバイス配列をリフレッシュする.	
			return navigator.mediaDevices.enumerateDevices();
	})
	.then(gotDevices)
	.catch(errorCallback);
}

audioSelect.onchange = stereoAudio;
voiceSelect.onchange = camera;
videoSelect.onchange = camera;
audioOutSelect.onchange = changeAudioDestination;
voiceOutSelect.onchange = changeVoiceDestination;

////////////////////////////////////////////////////////////////////////////////
