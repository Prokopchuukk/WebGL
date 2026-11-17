'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A TrackballRotator object
let lightAngle = 0;             // Кут для обертання джерела світла по колу

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Допоміжна функція для множення матриці 4x4 на точку [x, y, z, 1]
function transformPoint(m, p) {
    let x = p[0], y = p[1], z = p[2];
    return [
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14]
    ];
}

// Отримання матриці нормалей 3x3 з матриці 4x4
function extractNormalMatrix(m) {
    let inv = m4.inverse(m);
    let transp = m4.transpose(inv);
    return new Float32Array([
        transp[0], transp[1], transp[2],
        transp[4], transp[5], transp[6],
        transp[8], transp[9], transp[10]
    ]);
}

// Constructor
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iAttribNormal = -1;

    this.iModelViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iNormalMatrix = -1;

    this.iLightPosition = -1;
    this.iColor = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    };
}

function draw() { 
    gl.clearColor(0.05, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Проекційна матриця
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12); 
    
    // Матриця вигляду з TrackballRotator
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0); // Це фінальна ModelViewMatrix

    // Обчислюємо NormalMatrix
    let normalMatrix = extractNormalMatrix(matAccum1);

    // Обчислюємо позицію джерела світла, що рухається по колу у світових координатах
    let radius = 3.5;
    let worldLightPos = [
        radius * Math.cos(lightAngle),
        radius * Math.sin(lightAngle),
        1.5
    ];

    // Множимо координати світла на матрицю ModelView перед передачею в GPU
    let viewLightPos = transformPoint(matAccum1, worldLightPos);

    // Передаємо матриці та параметри освітлення в шейдер
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.uniform3fv(shProgram.iLightPosition, viewLightPos);
    
    // Колір поверхні (наприклад, бірюзово-блакитний металік)
    gl.uniform4fv(shProgram.iColor, [0.2, 0.7, 0.9, 1.0]);

    if (surface) {
        surface.Draw(gl, shProgram);
    }
}

// Анімаційний цикл для обертання джерела світла
function animate() {
    lightAngle += 0.02;
    draw();
    requestAnimationFrame(animate);
}

// Обробник зміни повзунків U та V
function updateSurface() {
    const uSteps = parseInt(document.getElementById("uSlider").value, 10);
    const vSteps = parseInt(document.getElementById("vSlider").value, 10);

    document.getElementById("uVal").textContent = uSteps;
    document.getElementById("vVal").textContent = vSteps;

    if (surface) {
        surface.uSteps = uSteps;
        surface.vSteps = vSteps;
        surface.generateSurfaceData();
        surface.BufferData(gl);
    }
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Phong', prog);
    shProgram.Use();

    shProgram.iAttribVertex     = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal     = gl.getAttribLocation(prog, "normal");

    shProgram.iModelViewMatrix  = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix     = gl.getUniformLocation(prog, "NormalMatrix");

    shProgram.iLightPosition    = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iColor            = gl.getUniformLocation(prog, "color");

    surface = new SurfaceModel(30, 30);
    surface.BufferData(gl);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    // Запускаємо цикл анімації світла
    animate();
}