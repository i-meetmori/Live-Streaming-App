import "./App.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MeetingProvider,
  MeetingConsumer,
  useMeeting,
  useParticipant,
  Constants,
} from "@videosdk.live/react-sdk";
import Hls from "hls.js";
import { authToken, createMeeting } from "./API";
import ReactPlayer from "react-player";

const MeetingView = () => {
  const { startLivestream, stopLivestream} = useMeeting();
  const handleStartLiveStream = () => {
    startLivestream(
      [
        {
          url: "rtmp://a.rtmp.youtube.com/live2",
          streamKey: "18ec-64v4-zmra-z89v-059z",
        },
        {
          url : "rtmp://live.twitch.tv/app/",
          streamKey: "live_951038856_NlDQVQfu3vZteA7kDQfNRJ75Ou2rcL"
        }
      ],
      {
        layout: {
          type: "GRID",
          priority: "SPEAKER",
          gridSize: 4,
        },
        theme: "DARK",
      }
    )
   
  }

  const handleStopLivestream = () => {
    stopLivestream();
  };
  return (
    <>
          <button onClick={handleStartLiveStream}>Start Live Stream</button><br/>
          <button onClick={handleStopLivestream}>Stop Live Stream</button>
    </>
  )
}
function JoinScreen({ getMeetingAndToken, setMode }) {
  const [meetingId, setMeetingId] = useState(null);

  const onClick = async (mode) => {
    setMode(mode);
    await getMeetingAndToken(meetingId);
  };
  return (
    <div className="container">
      <button onClick={() => onClick("CONFERENCE")}>Create Meeting</button>
      <br/>
      <br/>
      {" or "}
      <br/>
      <br/>
      <input 
        type="text"
        placeholder="Enter Meeting Id"
        onChange={(e) => {
          setMeetingId(e.target.value);
        }}
      />
      <br/>
      <br/>
      <button onClick={() => onClick("CONFERENCE")}>Join as Host</button>
      {" | "}
      <button onClick={() => onClick("VIEWER")}>Join as Viewer</button>
    </div>
  );
}

function ParticipantView(props) {
  const micRef = useRef(null);
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } = useParticipant(props.participantId);

  const videoStream = useMemo(() => {
    if(webcamOn && webcamStream) {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(webcamStream.track);
      return mediaStream;
    }
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    if(micRef.current) {
      if(micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);

        micRef.current.srcObject = mediaStream;
        micRef.current
          .play()
          .catch((error) =>
            console.error("videoElem.current.play() failed",error) 
          );
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);
  return (<div>
    <p>
      Participant : {displayName} | Webcam: {webcamOn ? "ON" : "OFF"} | Mic:{" "}
      {micOn ? "ON" : "OFF"}
    </p>
    <audio ref={micRef} autoPlay playsInline muted={isLocal}/>
    {webcamOn && (
      <ReactPlayer
        playsinline
        pip={false}
        light={false}
        controls={false}
        muted={true}
        playing={true}
        
        url={videoStream}

        height={"300px"}
        width={"300px"}
        onError={(err) => {
        console.log(err, "paricipant video error");
        }}
      />
    )}
  </div>);
}

function Controls() {
  
  const {leave, toggleMic, toggleWebcam, startHls, stopHls, startLivestream, stopLivestream } = useMeeting();

  return (
    <div>
      <button onClick={()=> leave()}>Leave</button>
      &emsp;|&emsp;
      <button onClick={() => toggleMic()}>toggleMic</button>
      <button onClick={() => toggleWebcam()}>toggleWebcam</button>
      &emsp;|&emsp;
      <button 
        onClick={() => {
          startHls({
            layout:{
              type: "SPOTLIGHT",
              priority: "PIN",
              gridSize: "20",
            },
            theme: "LIGHT",
            mode: "video-and-audio",
            quality: "high",
            orientation: "landscape",
          });
        }}>Start HLS</button>
      <button onClick={() => stopHls()}>Stop HLS</button>
    </div>
  );
}

function SpeakerView() {
  const { participants, hlsState } = useMeeting();

  const speakers = useMemo(() => {
    const speakerParticipants = [...participants.values()].filter(
      (participant) => {
        return participant.mode === Constants.modes.CONFERENCE;
      }
    );
    return speakerParticipants;
  }, [participants]);
  return (
    <div>
      <MeetingView/>
      <p>Current HLS State: {hlsState}</p>
      <Controls/>

      {speakers.map((participant) => (
        <ParticipantView participantId={participant.id} key={participant.id}/>
      ))}
    </div>
  );
}

function ViewerView() {
  const playerRef = useRef(null);

  const { hlsUrls, hlsState } = useMeeting();

  useEffect(() => {
    if(hlsUrls.downstreamUrl && hlsState == "HLS_PLAYABLE") {
      if(Hls.isSupported()){
        const hls = new Hls({
          capLevelToPlayerSize: true,
          maxloadingDelay: 4,
          minAutoBitrate: 0,
          autoStartLoad: true,
          defaultAudioCodec: "mp4a.40.2",
        });

        let player = document.querySelector("#hlsPlayer");

        hls.loadSource(hlsUrls.downstreamUrl);
        hls.attachMedia(player);
      } else {
        if(typeof playerRef.current?.play === "function"){
          playerRef.current.src = hlsUrls.downstreamUrl;
          playerRef.current.play();
        }
      }
    }
  }, [hlsUrls, hlsState, playerRef.current]);

  return (
    <div>
      <MeetingView/>
      {hlsState !== "HLS_PLAYABLE" ? (
        <div>
          <p> HLS has not started yet or is stopped</p>
        </div>
      ):(
        hlsState === "HLS_PLAYABLE" && (
          <div>
            <video
              ref={playerRef}
              id="hlsPlayer"
              autoPlay={true}
              controls
              style={{width:"100%" , height:"100%"}}
              playsinline
              playsInline
              muted={true}
              playing
              onError={(err) => {
                console.log(err, "hls video error");
              }}
              ></video>
          </div>
        )
      )}
    </div>
  );
}

function Container(props) {
  const [joined, setJoined] = useState(null);

  const{ join } = useMeeting();
  const mMeeting = useMeeting({
    onMeetingJoined: () => {
      if(mMeetingRef.current.localParticipant.mode === "CONFERENCE"){
          mMeetingRef.current.localParticipant.pin();
      }
      setJoined("JOINED");
    },

    onMeetingLeft: () => {
      props.onMeetingLeave();
    },

    onError: (error) => {
      alert(error.message);
    },
  });
  const joinMeeting = () => {
    setJoined("JOINING");
    join();
  };
  const mMeetingRef = useRef(mMeeting);
  useEffect(() => {
    mMeetingRef.current = mMeeting;
  }, [mMeeting]);
  return (
  <div className="container">
    <h3>Meeting Id: {props.meetingId}</h3>
    {joined && joined === "JOINED" ? (
      mMeeting.localParticipant.mode === Constants.modes.CONFERENCE ? (
        <SpeakerView/>
      
      ): mMeeting.localParticipant.mode === Constants.mode.VIEWER ? (
        <ViewerView/>
      ): null 
    ) : joined && joined === "JOINING" ? (
      <p>Joining the meeting...</p>
    ) : ( 
      <button onClick={joinMeeting}>Join</button>
    )}
  </div>);
}

function App() {
  const [meetingId, setMeetingId] = useState(null);

  //State to handle the mode of the participant i.e. CONFERNCE or VIEWER
  const [mode, setMode] = useState("CONFERENCE");

  //Getting MeetingId from the API we created earlier
  const getMeetingAndToken = async (id) => {
    const meetingId =
      id == null ? await createMeeting({ token: authToken }) : id;
    setMeetingId(meetingId);
  };

  const onMeetingLeave = () => {
    setMeetingId(null);
  };

  return authToken && meetingId ? (
    <MeetingProvider
      config={{
        meetingId,
        micEnabled: true,
        webcamEnabled: true,
        name: "C.V. Raman",
        //These will be the mode of the participant CONFERENCE or VIEWER
        mode: mode,
      }}
      token={authToken}
    >
      <MeetingConsumer>
        {() => (
          <Container meetingId={meetingId} onMeetingLeave={onMeetingLeave} />
        )}
      </MeetingConsumer>
    </MeetingProvider>
  ) : (
    <JoinScreen getMeetingAndToken={getMeetingAndToken} setMode={setMode} />
  );
}

export default App;