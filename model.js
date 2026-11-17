'use strict';

/**
 * Варіант 17: Surface of Revolution of a General Sinusoid
 * Трикутна сітка з індексами (VBO + IBO) та нормалями (Facet Average)
 */
function SurfaceModel(uSteps = 30, vSteps = 30) {
    this.uSteps = uSteps;
    this.vSteps = vSteps;

    // Параметри синусоїди r(u) = A * sin(omega * u) + R0
    this.A = 0.4;
    this.omega = 3.0;
    this.R0 = 0.8;
    this.uMin = -1.5;
    this.uMax = 1.5;

    // Масиви даних
    this.vertices = [];
    this.normals = [];
    this.indices = [];

    // WebGL буфери
    this.iVertexBuffer = null;
    this.iNormalBuffer = null;
    this.iIndexBuffer = null;

    this.generateSurfaceData();
}

// Обчислення координат точки (x, y, z)
SurfaceModel.prototype.evaluate = function(u, v) {
    const r = this.A * Math.sin(this.omega * u) + this.R0;
    const x = r * Math.cos(v);
    const y = r * Math.sin(v);
    const z = u;
    return [x, y, z];
};

// Генерація вершин, індексів трикутників та нормалей (Facet Average)
SurfaceModel.prototype.generateSurfaceData = function() {
    this.vertices = [];
    this.indices = [];

    const du = (this.uMax - this.uMin) / this.uSteps;
    const dv = (2.0 * Math.PI) / this.vSteps;

    // 1. Генеруємо сітку вершин (uSteps + 1) x (vSteps + 1)
    for (let i = 0; i <= this.uSteps; i++) {
        const u = this.uMin + i * du;
        for (let j = 0; j <= this.vSteps; j++) {
            const v = j * dv;
            const pt = this.evaluate(u, v);
            this.vertices.push(pt[0], pt[1], pt[2]);
        }
    }

    // 2. Генеруємо індекси для трикутників
    const rowLength = this.vSteps + 1;
    for (let i = 0; i < this.uSteps; i++) {
        for (let j = 0; j < this.vSteps; j++) {
            const p0 = i * rowLength + j;
            const p1 = (i + 1) * rowLength + j;
            const p2 = i * rowLength + (j + 1);
            const p3 = (i + 1) * rowLength + (j + 1);

            // Два трикутники на кожну клітинку сітки (зовнішній обхід)
            this.indices.push(p0, p2, p1);
            this.indices.push(p1, p2, p3);
        }
    }

    // 3. Обчислюємо нормалі методом "Фацетне середнє" (Facet Average)
    this.computeFacetAverageNormals();
};

SurfaceModel.prototype.computeFacetAverageNormals = function() {
    const numVertices = this.vertices.length / 3;
    this.normals = new Array(this.vertices.length).fill(0);

    // Проходимо по кожному трикутнику
    for (let k = 0; k < this.indices.length; k += 3) {
        const i0 = this.indices[k];
        const i1 = this.indices[k + 1];
        const i2 = this.indices[k + 2];

        const p0x = this.vertices[i0 * 3], p0y = this.vertices[i0 * 3 + 1], p0z = this.vertices[i0 * 3 + 2];
        const p1x = this.vertices[i1 * 3], p1y = this.vertices[i1 * 3 + 1], p1z = this.vertices[i1 * 3 + 2];
        const p2x = this.vertices[i2 * 3], p2y = this.vertices[i2 * 3 + 1], p2z = this.vertices[i2 * 3 + 2];

        // Вектори сторін трикутника
        const e1x = p1x - p0x, e1y = p1y - p0y, e1z = p1z - p0z;
        const e2x = p2x - p0x, e2y = p2y - p0y, e2z = p2z - p0z;

        // Векторний добуток e1 x e2 (нормаль грані)
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;

        // Нормалізуємо нормаль грані (важливо для Facet Average без зважування площею)
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-8) {
            nx /= len;
            ny /= len;
            nz /= len;
        }

        // Підсумовуємо нормаль грані до всіх трьох її вершин
        this.normals[i0 * 3] += nx; this.normals[i0 * 3 + 1] += ny; this.normals[i0 * 3 + 2] += nz;
        this.normals[i1 * 3] += nx; this.normals[i1 * 3 + 1] += ny; this.normals[i1 * 3 + 2] += nz;
        this.normals[i2 * 3] += nx; this.normals[i2 * 3 + 1] += ny; this.normals[i2 * 3 + 2] += nz;
    }

    // Нормалізуємо підсумковий вектор у кожній вершині
    for (let v = 0; v < numVertices; v++) {
        const idx = v * 3;
        const nx = this.normals[idx];
        const ny = this.normals[idx + 1];
        const nz = this.normals[idx + 2];
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-8) {
            this.normals[idx] /= len;
            this.normals[idx + 1] /= len;
            this.normals[idx + 2] /= len;
        }
    }
};

// Завантаження вершин, нормалей та індексів у буфери GPU
SurfaceModel.prototype.BufferData = function(gl) {
    if (!this.iVertexBuffer) this.iVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

    if (!this.iNormalBuffer) this.iNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

    if (!this.iIndexBuffer) this.iIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
};

// Малювання поверхні заповненими трикутниками через індекси
SurfaceModel.prototype.Draw = function(gl, shProgram) {
    // 1. Прив'язуємо координати вершин
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    // 2. Прив'язуємо нормалі вершин
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribNormal);

    // 3. Прив'язуємо індексний буфер і малюємо трикутники
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
};