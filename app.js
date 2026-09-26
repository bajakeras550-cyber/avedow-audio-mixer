/* =========================================================
   AVEDOW AUDIO MIXER V2
   FIXED AUDIO ENGINE + 10 BAND EQ
========================================================= */

let audioContext = null;
let audioElement = new Audio();

let sourceNode = null;
let masterGain = null;
let limiterNode = null;
let analyser = null;

let eqFilters = [];
let channelGains = [];
let channelPanners = [];

let powered = false;
let currentObjectURL = null;


/* =========================================================
   FREQUENCIES
========================================================= */

const frequencies = [
  31,
  62,
  125,
  250,
  500,
  1000,
  2000,
  4000,
  8000,
  16000
];


/* =========================================================
   CREATE EQ UI
========================================================= */

const eqContainer = document.getElementById("eq");

eqContainer.innerHTML = "";

frequencies.forEach((frequency, index) => {

  const band = document.createElement("div");

  band.className = "eq-band";

  band.innerHTML = `
    <div class="eq-frequency">
      ${frequency >= 1000 ? frequency / 1000 + "k" : frequency}
    </div>

    <input
      class="eq-slider"
      type="range"
      min="-12"
      max="12"
      step="0.5"
      value="0"
      data-index="${index}"
    >

    <div class="eq-value" id="eqValue${index}">
      0 dB
    </div>
  `;

  eqContainer.appendChild(band);

});


/* =========================================================
   AUDIO ENGINE
========================================================= */

function initAudio() {

  if (audioContext) {
    return;
  }

  audioContext = new (
    window.AudioContext ||
    window.webkitAudioContext
  )();

  /*
    IMPORTANT:

    Audio source
       ↓
    EQ 1
       ↓
    EQ 2
       ↓
    ...
       ↓
    EQ 10
       ↓
    Master
       ↓
    Limiter
       ↓
    Analyzer
       ↓
    Speaker
  */

  sourceNode =
    audioContext.createMediaElementSource(
      audioElement
    );


  /* -------------------------
     CREATE 10 EQ FILTERS
  ------------------------- */

  let previousNode = sourceNode;

  eqFilters = [];

  frequencies.forEach((frequency, index) => {

    const filter =
      audioContext.createBiquadFilter();

    if (index === 0) {

      filter.type = "lowshelf";

    } else if (index === frequencies.length - 1) {

      filter.type = "highshelf";

    } else {

      filter.type = "peaking";

    }

    filter.frequency.value = frequency;

    filter.Q.value =
      index === 0 || index === frequencies.length - 1
        ? 0.7
        : 1.0;

    filter.gain.value = 0;

    previousNode.connect(filter);

    previousNode = filter;

    eqFilters.push(filter);

  });


  /* -------------------------
     MASTER
  ------------------------- */

  masterGain =
    audioContext.createGain();

  masterGain.gain.value = 1;


  /* -------------------------
     LIMITER
  ------------------------- */

  limiterNode =
    audioContext.createDynamicsCompressor();

  limiterNode.threshold.value = -3;
  limiterNode.knee.value = 0;
  limiterNode.ratio.value = 20;
  limiterNode.attack.value = 0.003;
  limiterNode.release.value = 0.1;


  /* -------------------------
     ANALYZER
  ------------------------- */

  analyser =
    audioContext.createAnalyser();

  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;


  /* -------------------------
     CONNECT EVERYTHING
  ------------------------- */

  previousNode.connect(masterGain);

  masterGain.connect(limiterNode);

  limiterNode.connect(analyser);

  analyser.connect(
    audioContext.destination
  );


  startMeter();

}


/* =========================================================
   POWER
========================================================= */

document
  .getElementById("powerBtn")
  .addEventListener("click", async () => {

    initAudio();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    powered = !powered;

    const button =
      document.getElementById("powerBtn");

    button.classList.toggle(
      "on",
      powered
    );

    /*
      Power OFF = audio berhenti
      Power ON  = audio aktif kembali
    */

    if (!powered) {

      audioElement.pause();

    }

  });


/* =========================================================
   FILE INPUT
========================================================= */

document
  .getElementById("fileInput")
  .addEventListener("change", event => {

    const file =
      event.target.files[0];

    if (!file) return;


    initAudio();


    if (currentObjectURL) {

      URL.revokeObjectURL(
        currentObjectURL
      );

    }


    currentObjectURL =
      URL.createObjectURL(file);


    audioElement.src =
      currentObjectURL;

    audioElement.load();


    document.getElementById(
      "fileName"
    ).textContent =
      file.name;

  });


/* =========================================================
   PLAY
========================================================= */

document
  .getElementById("playBtn")
  .addEventListener("click", async () => {

    initAudio();


    if (
      audioContext.state ===
      "suspended"
    ) {

      await audioContext.resume();

    }


    if (!audioElement.src) {

      alert(
        "Pilih file MP3 atau WAV terlebih dahulu."
      );

      return;

    }


    if (!powered) {

      powered = true;

      document
        .getElementById("powerBtn")
        .classList.add("on");

    }


    if (audioElement.paused) {

      try {

        await audioElement.play();

      } catch (error) {

        console.error(
          "Playback error:",
          error
        );

      }

    } else {

      audioElement.pause();

    }

  });


/* =========================================================
   STOP
========================================================= */

document
  .getElementById("stopBtn")
  .addEventListener("click", () => {

    audioElement.pause();

    audioElement.currentTime = 0;

  });


/* =========================================================
   SEEK
========================================================= */

const seek =
  document.getElementById("seek");


audioElement.addEventListener(
  "timeupdate",
  () => {

    if (
      !Number.isFinite(
        audioElement.duration
      )
    ) {

      return;

    }


    seek.value =
      (
        audioElement.currentTime /
        audioElement.duration
      ) * 100;


    document.getElementById(
      "time"
    ).textContent =
      formatTime(
        audioElement.currentTime
      )
      + " / "
      +
      formatTime(
        audioElement.duration
      );

  }
);


seek.addEventListener(
  "input",
  () => {

    if (
      !Number.isFinite(
        audioElement.duration
      )
    ) {

      return;

    }


    audioElement.currentTime =
      (
        Number(seek.value) / 100
      ) *
      audioElement.duration;

  }
);


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {

    return "00:00";

  }


  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);


  return (
    String(minutes).padStart(2, "0")
    +
    ":"
    +
    String(secs).padStart(2, "0")
  );

}


/* =========================================================
   EQ CONTROL
========================================================= */

document
  .querySelectorAll(".eq-slider")
  .forEach(slider => {

    slider.addEventListener(
      "input",
      () => {

        const index =
          Number(
            slider.dataset.index
          );

        const value =
          Number(
            slider.value
          );


        /*
          Update visual number
        */

        document.getElementById(
          "eqValue" + index
        ).textContent =
          value + " dB";


        /*
          Update REAL Web Audio filter
        */

        if (
          eqFilters[index] &&
          audioContext
        ) {

          const now =
            audioContext.currentTime;

          eqFilters[index]
            .gain
            .cancelScheduledValues(now);

          eqFilters[index]
            .gain
            .setTargetAtTime(
              value,
              now,
              0.015
            );

        }


        /*
          Changing slider means CUSTOM
        */

        document.getElementById(
          "preset"
        ).value = "custom";

      }
    );

  });


/* =========================================================
   EQ PRESETS
========================================================= */

const presets = {

  flat: [
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
  ],

  bass: [
    7, 6, 5, 3, 1,
    0, -1, -2, -2, -2
  ],

  vocal: [
    -3, -2, -1, 2, 4,
    5, 4, 2, 0, -1
  ],

  dance: [
    6, 5, 3, 0, -2,
    0, 2, 4, 5, 4
  ],

  rock: [
    5, 4, 3, 0, -2,
    2, 4, 5, 4, 3
  ]

};


document
  .getElementById("preset")
  .addEventListener(
    "change",
    event => {

      const values =
        presets[
          event.target.value
        ];

      if (!values) return;


      values.forEach(
        (value, index) => {

          const slider =
            document.querySelector(
              `.eq-slider[data-index="${index}"]`
            );


          slider.value = value;


          document.getElementById(
            "eqValue" + index
          ).textContent =
            value + " dB";


          /*
            REAL EQ UPDATE
          */

          if (
            eqFilters[index] &&
            audioContext
          ) {

            const now =
              audioContext.currentTime;

            eqFilters[index]
              .gain
              .cancelScheduledValues(now);

            eqFilters[index]
              .gain
              .setTargetAtTime(
                value,
                now,
                0.015
              );

          }

        }
      );

    }
  );


/* =========================================================
   MASTER VOLUME
========================================================= */

document
  .getElementById("masterVolume")
  .addEventListener(
    "input",
    event => {

      const value =
        Number(
          event.target.value
        );


      if (
        masterGain &&
        audioContext
      ) {

        masterGain.gain.setTargetAtTime(
          value,
          audioContext.currentTime,
          0.01
        );

      }


      const db =
        value > 0
          ? 20 * Math.log10(value)
          : -Infinity;


      document.getElementById(
        "masterDb"
      ).textContent =
        Number.isFinite(db)
          ? db.toFixed(1) + " dB"
          : "-∞ dB";

    }
  );


/* =========================================================
   DLMS TARGET
========================================================= */

document
  .getElementById("dlmsTarget")
  .addEventListener(
    "input",
    event => {

      document.getElementById(
        "dlmsTargetText"
      ).textContent =
        event.target.value +
        " dB";

    }
  );


/* =========================================================
   LIMITER
========================================================= */

document
  .getElementById("limiter")
  .addEventListener(
    "change",
    event => {

      if (!limiterNode) return;


      if (event.target.checked) {

        limiterNode.threshold.value =
          -3;

        limiterNode.knee.value =
          0;

        limiterNode.ratio.value =
          20;

      } else {

        limiterNode.threshold.value =
          0;

        limiterNode.knee.value =
          0;

        limiterNode.ratio.value =
          1;

      }

    }
  );


/* =========================================================
   MIXER
========================================================= */

const mixer =
  document.getElementById("mixer");

const channels = [];


for (
  let index = 0;
  index < 4;
  index++
) {

  channels.push({
    volume: 1,
    pan: 0,
    mute: false,
    solo: false
  });


  const channel =
    document.createElement("div");

  channel.className =
    "channel";


  channel.innerHTML = `

    <h3>CHANNEL ${index + 1}</h3>

    <div class="channel-meter">
      <div id="channelMeter${index}"></div>
    </div>

    <label>VOLUME</label>

    <input
      id="channelVolume${index}"
      type="range"
      min="0"
      max="1"
      step="0.01"
      value="1"
    >

    <div
      class="channel-label"
      id="channelVolumeText${index}"
    >
      100%
    </div>

    <label>PAN</label>

    <input
      id="channelPan${index}"
      type="range"
      min="-1"
      max="1"
      step="0.01"
      value="0"
    >

    <div
      class="channel-label"
      id="channelPanText${index}"
    >
      CENTER
    </div>

    <div class="channel-buttons">

      <button
        id="mute${index}"
      >
        MUTE
      </button>

      <button
        id="solo${index}"
      >
        SOLO
      </button>

    </div>

  `;


  mixer.appendChild(channel);


  /* VOLUME */

  document
    .getElementById(
      `channelVolume${index}`
    )
    .addEventListener(
      "input",
      event => {

        channels[index].volume =
          Number(event.target.value);


        document.getElementById(
          `channelVolumeText${index}`
        ).textContent =
          Math.round(
            channels[index].volume * 100
          ) + "%";

      }
    );


  /* PAN */

  document
    .getElementById(
      `channelPan${index}`
    )
    .addEventListener(
      "input",
      event => {

        channels[index].pan =
          Number(event.target.value);


        let text =
          "CENTER";


        if (
          channels[index].pan < -0.05
        ) {

          text = "LEFT";

        }


        if (
          channels[index].pan > 0.05
        ) {

          text = "RIGHT";

        }


        document.getElementById(
          `channelPanText${index}`
        ).textContent =
          text;

      }
    );


  /* MUTE */

  document
    .getElementById(
      `mute${index}`
    )
    .addEventListener(
      "click",
      event => {

        channels[index].mute =
          !channels[index].mute;


        event.target.classList.toggle(
          "active",
          channels[index].mute
        );

      }
    );


  /* SOLO */

  document
    .getElementById(
      `solo${index}`
    )
    .addEventListener(
      "click",
      event => {

        channels[index].solo =
          !channels[index].solo;


        event.target.classList.toggle(
          "active",
          channels[index].solo
        );

      }
    );

}


/* =========================================================
   VU METER
========================================================= */

function startMeter() {

  if (!analyser) return;


  const data =
    new Uint8Array(
      analyser.frequencyBinCount
    );


  function update() {

    analyser.getByteFrequencyData(data);


    let sum = 0;


    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      sum +=
        data[i] * data[i];

    }


    const rms =
      Math.sqrt(
        sum / data.length
      );


    const level =
      Math.min(
        100,
        (rms / 255) * 180
      );


    document.getElementById(
      "masterMeter"
    ).style.width =
      level + "%";


    channels.forEach(
      (channel, index) => {

        let channelLevel =
          level *
          channel.volume;


        if (channel.mute) {

          channelLevel = 0;

        }


        document.getElementById(
          `channelMeter${index}`
        ).style.width =
          channelLevel + "%";

      }
    );


    requestAnimationFrame(update);

  }


  update();

}


/* =========================================================
   YOUTUBE
========================================================= */

document
  .getElementById("youtubeBtn")
  .addEventListener(
    "click",
    () => {

      const url =
        document
          .getElementById("youtubeUrl")
          .value
          .trim();


      const videoId =
        getYouTubeID(url);


      if (!videoId) {

        alert(
          "URL YouTube tidak dikenali."
        );

        return;

      }


      document.getElementById(
        "youtubeContainer"
      ).innerHTML = `

        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          title="YouTube video player"
          allow="
            accelerometer;
            autoplay;
            clipboard-write;
            encrypted-media;
            gyroscope;
            picture-in-picture;
            web-share
          "
          allowfullscreen>
        </iframe>

      `;

    }
  );


function getYouTubeID(url) {

  try {

    const parsed =
      new URL(url);


    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {

      return parsed.pathname
        .substring(1)
        .split("/")[0];

    }


    if (
      parsed.hostname.includes(
        "youtube.com"
      )
    ) {

      return parsed.searchParams
        .get("v");

    }

  } catch (error) {

    return null;

  }


  return null;

  }
