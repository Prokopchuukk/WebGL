'use strict';

/**
 * Варіант 17: Surface of Revolution of a General Sinusoid
 */
function SurfaceModel(uSteps = 30, vSteps = 30) {
    this.uSteps = uSteps;
    this.vSteps = vSteps;

    // Параметри синусоїди r(u) = A * sin(omega * u) + R0
    this.A = 0.4;       // Амплітуда
    this.omega = 3.0;   // Частота
    this.R0 = 0.8;      // Базовий радіус від осі обертання
    this.uMin = -1.5;   // Діапазон u (висота z)
    this.uMax = 1.5;

    // Масиви координат для двох наборів поліліній
    this.uLinesVertices = []; // U-криві
    this.vLinesVertices = []; // V-криві

    // WebGL буфери
    this.iBufferU = null;
    this.iBufferV = null;

    this.generateSurfaceData();
}

// 1. Математична формула обчислення точки (x, y, z)
SurfaceModel.prototype.evaluate = function(u, v) {
    const r = this.A * Math.sin(this.omega * u) + this.R0;
    const x = r * Math.cos(v);
    const y = r * Math.sin(v);
    const z = u;
    return [x, y, z];
};

// 2. Формування наборів точок для U-кривих та V-кривих
SurfaceModel.prototype.generateSurfaceData = function() {
    this.uLinesVertices = [];
    this.vLinesVertices = [];

    const du = (this.uMax - this.uMin) / this.uSteps;
    const dv = (2.0 * Math.PI) / this.vSteps;

    // U-криві (фіксуємо кут v, крокуємо по u)
    for (let j = 0; j <= this.vSteps; j++) {
        const v = j * dv;
        for (let i = 0; i <= this.uSteps; i++) {
            const u = this.uMin + i * du;
            const pt = this.evaluate(u, v);
            this.uLinesVertices.push(pt[0], pt[1], pt[2]);
        }
    }

    // V-криві (фіксуємо u, крокуємо по v)
    for (let i = 0; i <= this.uSteps; i++) {
        const u = this.uMin + i * du;
        for (let j = 0; j <= this.vSteps; j++) {
            const v = j * dv;
            const pt = this.evaluate(u, v);
            this.vLinesVertices.push(pt[0], pt[1], pt[2]);
        }
    }
};

// 3. Передача вершин у Vertex Buffer WebGL
SurfaceModel.prototype.BufferData = function(gl) {
    this.iBufferU = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iBufferU);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uLinesVertices), gl.STATIC_DRAW);

    this.iBufferV = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iBufferV);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vLinesVertices), gl.STATIC_DRAW);
};

// 4. Рендеринг поліліній за допомогою gl.LINE_STRIP
SurfaceModel.prototype.Draw = function(gl, shProgram) {
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    // Малюємо U-криві (синім кольором)
    gl.uniform4fv(shProgram.iColor, [0.2, 0.6, 1.0, 1.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iBufferU);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    const uPointsPerLine = this.uSteps + 1;
    for (let j = 0; j <= this.vSteps; j++) {
        gl.drawArrays(gl.LINE_STRIP, j * uPointsPerLine, uPointsPerLine);
    }

    // Малюємо V-криві (помаранчевим кольором)
    gl.uniform4fv(shProgram.iColor, [1.0, 0.5, 0.1, 1.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iBufferV);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    const vPointsPerLine = this.vSteps + 1;
    for (let i = 0; i <= this.uSteps; i++) {
        gl.drawArrays(gl.LINE_STRIP, i * vPointsPerLine, vPointsPerLine);
    }
};