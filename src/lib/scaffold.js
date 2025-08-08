/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {outputWidth, outputHeight} from './consts.js'

export const getScaffoldHead = () => {
  const colors = {
    // Brand Colors
    '--primary-color': '#8ab4f8',
    '--primary-color-variant': '#a8c7fa',
    '--secondary-color': '#c58af9', // Purple
    '--error-color': '#f28b82',

    // Background Colors
    '--background-color': '#202124',
    '--surface-color': '#282a2d', // Cards, sheets
    '--surface-color-variant': '#3c4043', // Slightly different surfaces

    // Text Colors
    '--text-color-primary': '#e8eaed',
    '--text-color-secondary': '#bdc1c6',
    '--text-color-disabled': '#9aa0a6',

    // Border Colors
    '--border-color': '#5f6368',
    '--border-color-variant': '#3c4043',
  };

  const cssVars = Object.entries(colors)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n    ');

  const themeStyleTag = `
<style>
  :root {
    ${cssVars}
    color-scheme: dark;
  }
  body {
    background-color: var(--background-color);
    color: var(--text-color-primary);
    font-family: 'Google Sans Display', 'Roboto', 'Helvetica Neue', sans-serif;
    margin: 0;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    overflow: hidden;
  }
  * {
    box-sizing: border-box;
  }
</style>
`;

  const consoleOverrideScript = `
<script>
  const originalConsole = {...console};
  window.onerror = function(message, source, lineno, colno, error) {
    const formattedMessage = \`Uncaught \${error?.name || 'Error'}: \${error?.message || message} at \${source?.split('/').pop()}:\${lineno}:\${colno}\`;
    window.parent.postMessage({ source: 'renderer-console', level: 'error', message: formattedMessage }, '*');
    originalConsole.error(error); // Also log to the real console
    return true; // Prevents default browser error handling
  };
  Object.keys(originalConsole).forEach(level => {
    if (typeof originalConsole[level] === 'function') {
      console[level] = (...args) => {
        originalConsole[level](...args);
        try {
          const message = args.map(arg => {
            if (arg instanceof Error) return arg.stack;
            if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
            return String(arg);
          }).join(' ');
          window.parent.postMessage({ source: 'renderer-console', level, message }, '*');
        } catch (e) {
          originalConsole.error('Error in console override:', e);
        }
      };
    }
  });
<\/script>
`;

  return consoleOverrideScript + themeStyleTag;
};

export const scaffolds = {
  canvas: (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getScaffoldHead()}
  <style>
    body { padding: 0; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas" width="${outputWidth}" height="${outputHeight}"></canvas>
  <script>
    try {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      (function() {
        ${code}
      })();
    } catch (e) {
      console.error(e);
    }
  </script>
</body>
</html>`,

  mermaid: (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: var(--background-color);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div class="mermaid">${code}</div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    try {
      mermaid.initialize({ startOnLoad: true, theme: 'dark', themeVariables: {
          "background": "#202124",
          "primaryColor": "#282a2d",
          "primaryTextColor": "#e8eaed",
          "lineColor": "#bdc1c6",
          "textColor": "#e8eaed"
        }
      });
    } catch (e) {
      console.error(e);
    }
  </script>
</body>
</html>`,

  plantUml: (code) => {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    return `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>
    body { display: flex; align-items: center; justify-content: center; padding: 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <img src="https://kroki.io/plantuml/svg/${encoded}" alt="PlantUML Diagram" />
</body>
</html>`;
  },

  p5: (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.1/p5.js"></script>
  ${getScaffoldHead()}
  <style>
    body, main { padding: 0; }
    canvas { vertical-align: top; }
  </style>
</head>
<body>
  <script>
    const theme = { isDark: true, colors: { primary: getComputedStyle(document.documentElement).getPropertyValue('--primary-color') } };
    ${code}
  </script>
</body>
</html>`,

  svg: (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getScaffoldHead()}
  <style>
    svg {
      width: 100%;
      height: 100%;
      max-width: ${outputWidth}px;
      max-height: ${outputHeight}px;
    }
  </style>
</head>
<body>
${code}
</body>
</html>
`,

  react: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${code}
      const container = document.getElementById('root');
      const root = ReactDOM.createRoot(container);
      root.render(typeof App === 'undefined' ? <div>Please define an App component</div> : <App />);
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,

  d3: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>
    svg { display: block; }
    .tick text { fill: var(--text-color-primary); font-family: sans-serif; }
    .tick line { stroke: var(--text-color-secondary); }
    path.domain { stroke: var(--text-color-primary); }
  </style>
  <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
  <script>
    try {
      const width = ${outputWidth};
      const height = ${outputHeight};
      ${code}
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,

  chartjs: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div style="width: 90%; max-width: 800px; height: 90%; max-height: 600px;"><canvas id="myChart"></canvas></div>
  <script>
    try {
      Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color-secondary').trim();
      Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
      const ctx = document.getElementById('myChart');
      ${code}
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,

  tailwind: (code) => `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class'
    }
  </script>
</head>
<body class="bg-gray-900 text-gray-100 flex items-center justify-center min-h-screen p-8">
  ${code}
</body>
</html>
`,

  ascii: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>
    pre { font-family: 'Google Sans Mono', monospace; white-space: pre; line-height: 1.2; font-size: 14px; }
  </style>
</head>
<body>
  <pre>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>
`,

  tonejs: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>
    body { flex-direction: column; text-align: center; gap: 1rem; }
    button { 
      padding: 10px 20px; 
      font-size: 16px; 
      background-color: var(--surface-color);
      color: var(--text-color-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
    }
    button:hover {
      border-color: var(--border-color-variant);
    }
  </style>
  <script src="https://unpkg.com/tone"></script>
</head>
<body>
  <h3>Tone.js Output</h3>
  <p>Click the button to start the audio.</p>
  <button id="startBtn">Start Audio</button>
  <script>
    try {
      let started = false;
      document.getElementById('startBtn').addEventListener('click', async () => {
        if (!started) {
          await Tone.start();
          started = true;
          document.getElementById('startBtn').textContent = 'Reload to Play Again';
          document.getElementById('startBtn').disabled = true;
          (function() {
            ${code}
          })();
        }
      });
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,

  css: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>
    ${code}
  </style>
</head>
<body>
  <div class="scene"></div>
</body>
</html>
`,
  vegaLite: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
</head>
<body>
  <div id="vis" style="width:100%; height: 100%;"></div>
  <script>
    try {
      const spec = ${code};
      vegaEmbed('#vis', spec, { theme: 'dark', "actions": false });
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  markdown: (code) => `
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.css">
  <style>
    body { 
      background: var(--background-color); 
    }
    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      height: 100vh;
      overflow: auto;
      color: var(--text-color-primary);
      background: var(--background-color);
    }
  </style>
</head>
<body data-color-mode="dark" data-dark-theme="dark">
  <article class="markdown-body" id="content"></article>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    try {
      document.body.dataset.colorMode = 'dark';
      const md = \`${code.replace(/`/g, '\\`')}\`;
      document.getElementById('content').innerHTML = marked.parse(md);
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  aframe: (code) => `
<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; }</style>
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
</head>
<body>
  ${code}
</body>
</html>
`,
  vue: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://unpkg.com/vue@3"></script>
</head>
<body>
  <div id="app"></div>
  <script>
    try {
      const { createApp } = Vue
      const App = {
        ${code}
      }
      createApp(App).mount('#app')
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  gsap: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
</head>
<body>
  ${code}
</body>
</html>
`,
  animejs: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js"></script>
</head>
<body>
  ${code}
</body>
</html>
`,
  leaflet: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    body { padding: 0; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-container { background: var(--surface-color) !important; }
    .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: var(--background-color); color: var(--text-color-primary); }
    .leaflet-control-attribution a { color: var(--primary-color); }
    .leaflet-control-zoom-in, .leaflet-control-zoom-out { background-color: var(--surface-color) !important; color: var(--text-color-primary) !important; border-bottom-color: var(--border-color) !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      const theme = 'dark';
      ${code}
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  phaser: (code) => `
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
    ${getScaffoldHead()}
    <style> body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: #000; } canvas { display: block; } </style>
</head>
<body>
    <script>
    try {
        const theme = { isDark: true, colors: { primary: getComputedStyle(document.documentElement).getPropertyValue('--primary-color') } };
        ${code}
        const config = {
            type: Phaser.AUTO,
            width: ${outputWidth},
            height: ${outputHeight},
            parent: document.body,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 200 }
                }
            },
            scene: (typeof PreloadScene !== 'undefined' && typeof MainScene !== 'undefined') ? [PreloadScene, MainScene] : (typeof GameScene !== 'undefined' ? GameScene : (typeof MainScene !== 'undefined' ? MainScene : undefined))
        };
        const game = new Phaser.Game(config);
    } catch(e) {
        console.error(e);
    }
    </script>
</body>
</html>
`,
  plotly: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <div id="chart" style="width:100%;height:100%;"></div>
  <script>
    try {
      const layoutUpdate = {
        paper_bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim(),
        plot_bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--surface-color').trim(),
        font: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--text-color-primary').trim()
        }
      };
      ${code}
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  glsl: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>body, html { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }</style>
</head>
<body>
  <canvas id="glcanvas"></canvas>
  <script>
    try {
        const canvas = document.getElementById('glcanvas');
        const gl = canvas.getContext('webgl');
        let time = 0;
        let program;

        function createShader(gl, type, source) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const errorMsg = 'Shader Compile Error: ' + gl.getShaderInfoLog(shader);
            console.error(errorMsg);
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        }

        const vsSource = \`
          attribute vec4 aVertexPosition;
          void main(void) {
            gl_Position = aVertexPosition;
          }
        \`;

        const fsSource = \`
          #ifdef GL_ES
          precision mediump float;
          #endif
          uniform vec2 u_resolution;
          uniform float u_time;
          ${code}
          void main() {
            mainImage(gl_FragColor, gl_FragCoord.xy);
          }
        \`.replace('mainImage(out vec4 fragColor, in vec2 fragCoord)', 'mainImage');

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if(!vertexShader || !fragmentShader) throw new Error("Shader creation failed.");

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        }

        gl.useProgram(program);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const vloc = gl.getAttribLocation(program, 'aVertexPosition');
        gl.enableVertexAttribArray(vloc);
        gl.vertexAttribPointer(vloc, 2, gl.FLOAT, false, 0, 0);

        const u_resolution = gl.getUniformLocation(program, 'u_resolution');
        const u_time = gl.getUniformLocation(program, 'u_time');

        function render(t) {
          time = t * 0.001;
          const { clientWidth: w, clientHeight: h } = gl.canvas;
          if (gl.canvas.width !== w || gl.canvas.height !== h) {
            gl.canvas.width = w;
            gl.canvas.height = h;
            gl.viewport(0, 0, w, h);
          }
          gl.uniform2f(u_resolution, w, h);
          gl.uniform1f(u_time, time);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    } catch(e) {
        console.error(e);
    }
  </script>
</body>
</html>
`,
  solid: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
</head>
<body>
  <div id="root"></div>
  <script type="module">
    try {
      const solid = await import('https://esm.sh/solid-js/web');
      const { render } = solid;
      const { createSignal, createEffect } = await import('https://esm.sh/solid-js');
      const root = document.getElementById('root');
      (function(render, createSignal, createEffect, root) {
        ${code}
      })(render, createSignal, createEffect, root);
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  lit: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
</head>
<body>
  <script type="module">
    import {LitElement, html, css} from 'https://esm.sh/lit';
    try {
      ${code}
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  alpine: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body>
  ${code}
</body>
</html>
`,
  jquery: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style> body { padding: 1rem; } </style>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body>
  <script>
    $(function() {
      try {
        ${code}
      } catch(e) {
        console.error(e);
      }
    });
  </script>
</body>
</html>
`,
  echarts: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <style>
    body { padding: 0; }
    #chart { width: 100vw; height: 100vh; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
</head>
<body>
  <div id="chart"></div>
  <script>
    try {
      var chartDom = document.getElementById('chart');
      var myChart = echarts.init(chartDom, 'dark');
      var option;
      ${code}
      option && myChart.setOption(option);
      window.onresize = () => myChart.resize();
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  babylon: (code) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    html, body { overflow: hidden; width: 100%; height: 100%; margin: 0; padding: 0; background: #000; }
    #renderCanvas { width: 100%; height: 100%; touch-action: none; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/babylonjs@7.9.0/babylon.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/babylonjs-loaders@7.9.0/babylonjs.loaders.min.js"></script>
  ${getScaffoldHead()}
</head>
<body>
  <canvas id="renderCanvas"></canvas>
  <script>
    try {
      const canvas = document.getElementById("renderCanvas");
      const engine = new BABYLON.Engine(canvas, true);
      const theme = 'dark';
      ${code}
      const scene = createScene();
      engine.runRenderLoop(function () {
        if (scene) scene.render();
      });
      window.addEventListener("resize", function () {
        engine.resize();
      });
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`,
  revealjs: (code) => `
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css" id="theme">
  ${getScaffoldHead()}
  <style>
    .reveal { font-family: 'Google Sans Display', sans-serif; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <section data-markdown data-separator="^---$" data-separator-vertical="^--$">
        <textarea data-template>
          ${code}
        </textarea>
      </section>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/markdown/markdown.js"></script>
  <script>
    Reveal.initialize({ hash: true, plugins: [ RevealMarkdown ] });
  </script>
</body>
</html>
`,
  reactNative: (code) => `
<!DOCTYPE html>
<html>
<head>
  ${getScaffoldHead()}
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/react-native-web@0.19/dist/umd/index.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style> body { padding: 0; align-items: stretch; justify-content: stretch; } #root, #root > div, #root > div > div { flex: 1; } </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      const { AppRegistry, useColorScheme } = ReactNativeWeb;
      const theme = 'dark';
      ${code}
      AppRegistry.registerComponent('App', () => App);
      AppRegistry.runApplication('App', {
        rootTag: document.getElementById('root'),
      });
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`
}

scaffolds.poetry = scaffolds.markdown
scaffolds.recipe = scaffolds.markdown
scaffolds.userStory = scaffolds.markdown
scaffolds.adCopy = scaffolds.markdown
scaffolds.email = scaffolds.markdown
scaffolds.svelte = (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  ${getScaffoldHead()}
  <style>
    /* Add any global styles needed for Svelte apps here */
  </style>
</head>
<body>
  <script type="module">
    import "https://esm.sh/zone.js@0.14.2/dist/zone.js";
    import "https://esm.sh/reflect-metadata@0.2.1/Reflect.js";
    const svelte = await import('https://esm.sh/svelte@4.2.7/compiler');

    try {
      const { js } = svelte.compile(\`${code.replace(/`/g, '\\`')}\`, {
        generate: 'dom',
        hydratable: true
      });
      const Component = (await import(URL.createObjectURL(new Blob([js.code], { type: 'application/javascript' })))).default;
      new Component({
        target: document.body,
      });
    } catch(e) {
      console.error(e);
    }
  </script>
</body>
</html>
`;
scaffolds.html = (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  ${getScaffoldHead()}
</head>
<body>
  ${code}
</body>
</html>
`;
scaffolds.aiProjectPlanner = scaffolds.markdown;
scaffolds.xaiReport = scaffolds.markdown;
scaffolds.promptEnhancer = scaffolds.markdown;
scaffolds.ragSystemDesign = scaffolds.mermaid;
scaffolds.microserviceArchitecture = scaffolds.mermaid;
scaffolds.aiBiasTestPlan = scaffolds.markdown;
