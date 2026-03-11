'use client';

import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

type IridescenceProps = {
  color?: [number, number, number];
  speed?: number;
  amplitude?: number;
  mouseReact?: boolean;
  className?: string;
};

export function Iridescence({
  color = [0.14, 0.24, 0.46],
  speed = 0.45,
  amplitude = 0.08,
  mouseReact = true,
  className = ''
}: IridescenceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const element = container;

    const renderer = new Renderer({ alpha: true, antialias: true });
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 0);

    let program: Program | null = null;

    function resize() {
      const scale = 1;
      renderer.setSize(element.offsetWidth * scale, element.offsetHeight * scale);
      if (program) {
        program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
      }
    }

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(...color) },
        uResolution: { value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        uMouse: { value: new Float32Array([mousePos.current.x, mousePos.current.y]) },
        uAmplitude: { value: amplitude },
        uSpeed: { value: speed }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animationId = 0;

    function update(time: number) {
      animationId = window.requestAnimationFrame(update);
      if (program) {
        program.uniforms.uTime.value = time * 0.001;
      }
      renderer.render({ scene: mesh });
    }

    function handleMouseMove(event: MouseEvent) {
      if (!program) return;
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      mousePos.current = { x, y };
      (program.uniforms.uMouse.value as Float32Array)[0] = x;
      (program.uniforms.uMouse.value as Float32Array)[1] = y;
    }

    window.addEventListener('resize', resize);
    resize();
    animationId = window.requestAnimationFrame(update);
    element.appendChild(gl.canvas);

    if (mouseReact) {
      element.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (mouseReact) {
        element.removeEventListener('mousemove', handleMouseMove);
      }
      if (gl.canvas.parentNode === element) {
        element.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [amplitude, color, mouseReact, speed]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
