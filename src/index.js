import "./styles.css";
import GeoJson, { China as ChinaJson } from "china-geojson";
import { min, max, merge } from "lodash";
import randomcolor from "randomcolor";


const $scaleCtl = document.querySelector('.scale-contoller');
let scaleBase = 1;
let drag = false;
let dragPosition = null;
const globalTranslate = {x: 0, y: 0};
const $offscreenCanvas = document.createElement("canvas");
const octx = $offscreenCanvas.getContext("2d");
$offscreenCanvas.width = document.documentElement.clientWidth;
$offscreenCanvas.height = document.documentElement.clientHeight;
const $canvas = document.getElementById("canvas");
const ctx = $canvas.getContext("2d");
$canvas.width = document.documentElement.clientWidth;
$canvas.height = document.documentElement.clientHeight;


function matrixMultiply(v1, v2) {
  const matrix = [];
  if (v1[0].length !== v2.length) {
    throw new Error(`这两个矩阵之间的乘法无意义！`);
  }
  const rowSize = v1.length;
  const colSize = v2[0].length;
  for (let i = 0; i < rowSize; i++) {
    matrix.push([]);
    for (let j = 0; j < colSize; j++) {
      let dotProduct = 0;
      for (let k = 0; k < colSize; k++) {
        dotProduct += v1[i][k] * v2[k][j];
      }
      matrix[matrix.length - 1].push(dotProduct);
    }
  }
  return matrix;
}

function getGeoBounds(geo) {
  const { features } = geo;
  const coordinates = features
    .map(({ geometry: { coordinates } }) => coordinates)
    .flat(Infinity);
  // 经度
  const lons = coordinates.filter((coordinates, index) => index % 2 === 0);
  // 纬度
  const lats = coordinates.filter((coordinates, index) => index % 2 !== 0);
  return {
    minLon: min(lons),
    maxLon: max(lons),
    minLat: min(lats),
    maxLat: max(lats)
  };
}

function getScaleXY(ctx, geoBounds) {
  const { maxLon, minLon, minLat, maxLat } = geoBounds;
  return {
    scaleX: (((maxLon - minLon) * 3600) / ctx.canvas.width),
    scaleY: (((maxLat - minLat) * 3600) / ctx.canvas.height)
  };
}

function getPointerForScreen(coordinate, scales, geoBounds) {
  const [lon, lat] = coordinate;
  const { minLon, maxLat } = geoBounds;
  const { scaleX, scaleY } = scales;
  const x = ((lon - minLon) * 3600) / scaleX;
  const y = ((maxLat - lat) * 3600) / scaleY;
  const res = [x, y];
  return res;
}

function draw(ctx, geo, option, transform = [1,0,0,1,0,0]) {
  const defaultOption = {
    font: {
      fontSize: 24,
      fontWeight: "bold",
      fontFamily: "serif",
      fontColor: "black"
    }
  };
  const mergeOption = merge(defaultOption, option);
  const { features } = geo;
  const geoBounds = getGeoBounds(geo);
  const scales = getScaleXY(ctx, geoBounds);
  const coordinates = features.map(
    ({ geometry: { coordinates } }) => coordinates
  );
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.transform(...transform);
  coordinates.forEach((coordinate, index) => {
    let flatDeep = -2;
    let currCoordinate = coordinate[0];
    while (Array.isArray(currCoordinate)) {
      currCoordinate = currCoordinate[0];
      flatDeep++;
    }
    const color = randomcolor();
    coordinate.flat(flatDeep).forEach((partCoordinate) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      partCoordinate.forEach((areaCoordinate, index) => {
        const [x, y] = getPointerForScreen(areaCoordinate, scales, geoBounds);
        if (index !== 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.moveTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    });
  });
  coordinates.forEach((coordinate, index) => {
    const { name, cp, longitude, latitude } = features[index].properties;
    const scaleCp = getPointerForScreen(
      cp ? cp : [longitude, latitude],
      scales,
      geoBounds
    );
    ctx.save();
    ctx.fillStyle = mergeOption.font.fontColor;
    ctx.font = `${mergeOption.font.fontWeight} ${mergeOption.font.fontSize}px ${mergeOption.font.fontFamily}`;
    ctx.translate(scaleCp[0] - mergeOption.font.fontSize, scaleCp[1]);
    ctx.fillText(name, 0, 0, 100);
    ctx.restore();
  });
  ctx.restore();
}

// draw(ctx, GeoJson["海南"], { font: { fontColor: "white" } });
// draw(ctx, GeoJson["江西"]);
// draw(ctx, GeoJson["广东"]);
// draw(ctx, GeoJson["上海"], {font: {fontColor: 'red'}});
// draw(ctx, ChinaJson);
draw(ctx, GeoJson["China"], { font: { fontColor: "white" } });

$scaleCtl.addEventListener('click', ({target}) => {
  if (target.classList.contains('magnify')) {
    scaleBase += 100 * 0.001;
  } else if (target.classList.contains('minify')){
    scaleBase -= 100 * 0.001;
  } else if (target.classList.contains('reset')) {
    scaleBase = 1;
    globalTranslate.x = 0
    globalTranslate.y = 0;
  }
  draw(ctx, GeoJson["China"], { font: { fontColor: "white" }}, [scaleBase, 0, 0, scaleBase, globalTranslate.x, globalTranslate.y]);
}, true);

window.addEventListener('mousedown', (e) => {
  const {target, clientX, clientY} = e;
  e.preventDefault();
  if (target !== $canvas) {
    return;
  }
  target.style.cursor = "grabbing";
  drag = true;
  dragPosition = {
    x: clientX,
    y: clientY
  };
}, true);

window.addEventListener('mousemove', (e) => {
  const {clientX, clientY} = e;
  e.preventDefault();
  if (!drag) {
    return;
  }
  globalTranslate.x += clientX - dragPosition.x;
  globalTranslate.y += clientY - dragPosition.y;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  draw(octx, GeoJson["China"], { font: { fontColor: "white" }}, [scaleBase, 0, 0, scaleBase, globalTranslate.x, globalTranslate.y]);
  ctx.drawImage($offscreenCanvas, 0, 0);
  ctx.restore();
  dragPosition = {
    x: clientX,
    y: clientY
  };
  
}, true);

window.addEventListener('mouseup', (e) => {
  const {target} = e;
  e.preventDefault();
  if (!drag) {
    return;
  }
  target.style.cursor = "grab";
  drag = false;
  dragPosition = null;
}, true);

window.addEventListener("wheel", (e) => {
  const {target} = e;
  if (target !== $canvas) {
    return;
  }
  scaleBase += e.deltaY * -0.001;
  draw(ctx, GeoJson["China"], { font: { fontColor: "white" }}, [scaleBase, 0, 0, scaleBase, globalTranslate.x, globalTranslate.y]);
}, true);