import "./styles.css";
import GeoJson, { China as ChinaJson } from "china-geojson";
//import ChinaJson from "./china.json";
import { min, max, merge } from "lodash";
import randomcolor from "randomcolor";
const $canvas = document.getElementById("canvas");
const ctx = $canvas.getContext("2d");
$canvas.width = window.innerWidth - 40;
$canvas.height = window.innerHeight - 40;

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
    scaleX: ((maxLon - minLon) * 3600) / ctx.canvas.width,
    scaleY: ((maxLat - minLat) * 3600) / ctx.canvas.height
  };
}

function getPointerForScreen(coordinate, scales, geoBounds) {
  const [lon, lat] = coordinate;
  const { minLon, maxLat } = geoBounds;
  const { scaleX, scaleY } = scales;
  const x = ((lon - minLon) * 3600) / scaleX;
  const y = ((maxLat - lat) * 3600) / scaleY;
  return [x, y];
}

function draw(ctx, geo, option) {
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
      partCoordinate.forEach((areaCoordinate, index, arr) => {
        if (!Array.isArray(areaCoordinate)) {
          debugger;
        }
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
}

// draw(ctx, GeoJson["海南"], { font: { fontColor: "white" } });
// draw(ctx, GeoJson["江西"]);
// draw(ctx, GeoJson["广东"]);
//draw(ctx, GeoJson["上海"], {font: {fontColor: 'red'}});
//draw(ctx, ChinaJson);
draw(ctx, GeoJson["China"], { font: { fontColor: "white" } });
