// MCF.js   by YUICHI NOHARA
// WebRTCで画面共有、ステレオオーディオ共有とMIDIの通信を実現する

////////////////////////////////////////////////////////////////////////////////
//　Web RTC
////////////////////////////////////////////////////////////////////////////////

var connectedCall;		// Media Stream用, callオブジェクトの保存変数.
var conn;				// RTC Data Channel用, connectionオブジェクトの保存用変数.
var myStream1;		// myのステレオオーディオストリームの保存変数.
var myStream2;		// myのスクリーンキャプチャーストリームの保存変数.
var myStream3;		// myのカメラストリームの保存用変数.
// var myMultiTrackStream;	// 送信用のマルチトラックストリーム.

// SkyWayのシグナリングサーバへ接続する
peerId = String(Math.floor(Math.random() * 9000) + 1000);			// 1000から9999の乱数を生成
var options = { key: '6e67140f-5908-4026-a31b-ccb1e94d38c5' };	// APIキー情報
peer = new Peer(peerId, options);								// Peerを開始しLISTEN状態にする

// シグナリングサーバへの接続が確立時に, myのIDを表示する.
peer.on('open', function() {$('#my-id').text(peer.id);});

// Peerから接続要求が来た場合の動作 (Media Stream).
peer.on('call', function(call){
	// キャプチャー, オーディオ, カメラの すべてのストリームがある時のみ, 受信を許可する.
	if (myStream1 && myStream2 && myStream3){
		// callオブジェクトを保存する.
		connectedCall = call;
		// 接続できた場合は,  PeerのIDを表示する.
		$("#peer-id").text(call.peer);

		// myMultiTrackStreamにmyStream1-3を追加し, peerに渡す.	
		var myMultiTrackStream = new webkitMediaStream();
		myMultiTrackStream.addTrack(myStream1.getAudioTracks()[0]);
		myMultiTrackStream.addTrack(myStream2.getVideoTracks()[0]);
		myMultiTrackStream.addTrack(myStream3.getAudioTracks()[0]);
		myMultiTrackStream.addTrack(myStream3.getVideoTracks()[0]);
//		console.log(myMultiTrackStream.getVideoTracks());
//		console.log(myMultiTrackStream.getAudioTracks());
		call.answer(myMultiTrackStream);

		// peerからストリームが渡された場合の処理.
		call.on('stream', function(peerMultiTrackStream){
			// MultiTrackStreamを受信し, peerの最初のトラックを表示する.
			$('#peer-screen').prop('src', URL.createObjectURL(peerMultiTrackStream));		
			// peerの2番目のtrackを表示させるためのストリームを作り, それを表示する.
			var videotracks = peerMultiTrackStream.getVideoTracks();
//			var audiotracks = peerMultiTrackStream.getAudioTracks();
//			console.log(peerMultiTrackStream.getVideoTracks());
//			console.log(peerMultiTrackStream.getAudioTracks());
			var peerStream3 = new webkitMediaStream();
//			peerStream3.addTrack(audiotracks[1]);
			peerStream3.addTrack(videotracks[1]);
			$('#peer-video').prop('src', URL.createObjectURL(peerStream3));
		});
	} else {alert('未設定のデバイスがあります.')};
});

// Peerから接続要求が来た場合の動作 (RTC Data Channel).
peer.on('connection', function(connection){
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
//		console.log(data);
	if(output.checkOutputIdx()!="false") {output.sendRawMessage(event.detail.data)};
})

// 受信イベントの設定
function onRecvMessage(data) {	
//	console.log(data);
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
	// スクリーンのストリームを取得する
	getScreenId(function (error, sourceId, screen_constraints) {
		navigator.getUserMedia(screen_constraints,
			function(stream){
			// 送信に使うため保存する.
			myStream2 = stream;		
			}, function() { alert("getScreenId Error!"); 
		}); 
	});
	// カメラのストリームを取得する.
	camera();
	
	// connectボタンクリック時の動作
	$('#connect').click(function(){
		// キャプチャー, オーディオ, カメラの すべてのストリームがある時のみ, 送信を許可する.
		if (myStream1 && myStream2 && myStream3){
			// peerのIDを取得しconnectする.
			var peer_id = $('#peer-id-input').val();
			conn = peer.connect(peer_id);
        		// メッセージ受信イベントを設定する.
			conn.on("data", onRecvMessage);

			// myMultiTrackStreamにmyStream1-3を追加し, peerに渡す.
			var myMultiTrackStream = new webkitMediaStream();
			myMultiTrackStream.addTrack(myStream1.getAudioTracks()[0]);
			myMultiTrackStream.addTrack(myStream2.getVideoTracks()[0]);
			myMultiTrackStream.addTrack(myStream3.getAudioTracks()[0]);
			myMultiTrackStream.addTrack(myStream3.getVideoTracks()[0]);
//			console.log(myMultiTrackStream.getVideoTracks());
//			console.log(myMultiTrackStream.getAudioTracks());
			var call = peer.call(peer_id, myMultiTrackStream);

			// callオブジェクトを保存する.
			connectedCall = call;
			// Peerからストリームが渡された場合の処理.
			call.on('stream', function(peerMultiTrackStream){
				// PeerのIDを表示する
				$("#peer-id").text(call.peer);
				// MultiTrackStreamを受信し, peerの最初のトラックを表示する.
				$('#peer-screen').prop('src', URL.createObjectURL(peerMultiTrackStream));		
				// peerの2番目のtrackを表示させるためのストリームを作り, 表示する.
				var videotracks = peerMultiTrackStream.getVideoTracks();
//				var audiotracks = peerMultiTrackStream.getAudioTracks();
//				console.log(peerMultiTrackStream.getVideoTracks());
//				console.log(peerMultiTrackStream.getAudioTracks());
				var peerStream3 = new webkitMediaStream();
//				peerStream3.addTrack(audiotracks[1]);
				peerStream3.addTrack(videotracks[1]);
				$('#peer-video').prop('src', URL.createObjectURL(peerStream3));
			});
		} else {alert('未設定のデバイスがあります.')};
	});

	// Sendボタンクリック時の動作 (メッセージ送信)
	$("#send").click(function() {
		if(conn) {
			// メッセージを取得する.
			var message = $("#message").val();
			var data = {msg: message};
			// メッセージを送信する.
			conn.send(data);
//			console.log(data);
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
//				console.log(data);	
				};
			// 画面に送信したファイル名を表示する.
			$("#messages").append($("<p>").html("My : ファイルを送信しました. " + file.name));
			// ファイルの読み取りを行う. 	
			reader.readAsArrayBuffer(file);
		};
		// ファイル選択ボックスをクリアする.
		$("#file").val("");
	});

	// closeボタンクリック時の動作 (切断)
	$('#close').click(function() {
		connectedCall.close();
		conn.close();
	});
});

////////////////////////////////////////////////////////////////////////////////
//   Select Audio  & Video Device 
////////////////////////////////////////////////////////////////////////////////

var audioSelect = document.querySelector('select#audioSource');
var voiceSelect = document.querySelector('select#voiceSource');
var videoSelect = document.querySelector('select#videoSource');
var selectors = [audioSelect, voiceSelect, videoSelect];

// AudioとVideoのInputデバイスの配列作成とリスト表示と選択時の処理.
function gotDevices(deviceInfos) {
	// Handles being called several times to update labels. Preserve values.
	var values = selectors.map(function(select) {return select.value;});
	selectors.forEach(function(select) {
		while (select.firstChild) {select.removeChild(select.firstChild);}
	});

	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		var option = document.createElement('option');
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === 'audioinput') {
			option.text = deviceInfo.label || 'line in ' + (audioSelect.length + 1);
			audioSelect.appendChild(option);}
	}
	selectors.forEach(function(select, selectorIndex) {
		if (Array.prototype.slice.call(select.childNodes).some(function(n) {
			return n.value === values[selectorIndex];
		})) {select.value = values[selectorIndex];}
	});

	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		var option = document.createElement('option');
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === 'audioinput') {
			option.text = deviceInfo.label || 'microphone ' + (voiceSelect.length + 1);
			voiceSelect.appendChild(option);
		} else if (deviceInfo.kind === 'videoinput') {
			option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
			videoSelect.appendChild(option);} 
	}
	selectors.forEach(function(select, selectorIndex) {
		if (Array.prototype.slice.call(select.childNodes).some(function(n) {
			return n.value === values[selectorIndex];
		})) {select.value = values[selectorIndex];}
	});
}

navigator.mediaDevices.enumerateDevices()
.then(gotDevices)
.catch(errorCallback);

function errorCallback(error) {console.log('navigator.getUserMedia error: ', error);}

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
			// ステレオオーディオを再生する.
//			$('#my-audio').prop('src', URL.createObjectURL(stream));
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
//			googAudioMirroring: true,
			googTypingNoiseDetection: false
		},
		video: {deviceId: videoSource ? {exact: videoSource} : undefined,
			maxWidth: 640, 
			maxHeight: 480, 
			maxFrameRate: 30
		}
	};

	navigator.mediaDevices.getUserMedia(constraints)
		.then(function(stream) {
			// 送信に使うため保存する.
			myStream3 = stream;
			// My Cameraに表示する.
			$('#my-video').prop('src', URL.createObjectURL(stream));
			// デバイス配列をリフレッシュする.	
			return navigator.mediaDevices.enumerateDevices();
	})
	.then(gotDevices)
	.catch(errorCallback);
}

audioSelect.onchange = stereoAudio;
voiceSelect.onchange = camera;
videoSelect.onchange = camera;

////////////////////////////////////////////////////////////////////////////////
