// 纯 WebAudio 合成短音效，不引入外部音频素材。
// AudioContext 在首次用户手势（点击/按键）时创建并 resume，避免自动播放被拦截。
export function createAudio() {
  let ctx = null;
  let master = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // 振荡器音：freq 起始频率，slide 结束频率，type 波形，vol 音量，dur 时长，delay 延迟。
  function tone({ freq = 440, slide = 0, type = 'sine', vol = 0.2, dur = 0.12, delay = 0 }) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide > 0) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // 白噪声：filter 截止频率，band 为真用带通，否则低通。
  function noise({ dur = 0.1, vol = 0.15, filter = 1000, band = false, delay = 0 }) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = band ? 'bandpass' : 'lowpass';
    filterNode.frequency.value = filter;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filterNode).connect(gain).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const SFX = {
    // 挥动工具：短促空气划过声
    swing() {
      noise({ dur: 0.09, vol: 0.1, filter: 2400, band: true });
    },
    // 砍中/敲中：低频闷击 + 一点噪声
    chop() {
      tone({ freq: 130, slide: 60, type: 'square', vol: 0.22, dur: 0.12 });
      noise({ dur: 0.08, vol: 0.12, filter: 500 });
    },
    // 拾取资源/采到浆果：清脆上扬
    pickup() {
      tone({ freq: 620, slide: 880, type: 'sine', vol: 0.16, dur: 0.1 });
      tone({ freq: 930, type: 'sine', vol: 0.1, dur: 0.08, delay: 0.06 });
    },
    // 进食：两声轻柔短音
    eat() {
      tone({ freq: 300, slide: 220, type: 'sine', vol: 0.18, dur: 0.1 });
      tone({ freq: 260, slide: 200, type: 'sine', vol: 0.16, dur: 0.1, delay: 0.12 });
    },
    // 受击：低沉下坠
    hurt() {
      tone({ freq: 190, slide: 90, type: 'sawtooth', vol: 0.22, dur: 0.2 });
    },
    // 水花：带通噪声
    splash() {
      noise({ dur: 0.16, vol: 0.14, filter: 1600, band: true });
    },
    // 脚步：很轻的低频闷响
    footstep() {
      noise({ dur: 0.06, vol: 0.07, filter: 420 });
    },
  };

  function play(name) {
    const fn = SFX[name];
    if (fn) fn();
  }

  return { play, ensure };
}
