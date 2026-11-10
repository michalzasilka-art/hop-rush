// Hop Rush: a blocky road-crossing race for the classroom board. 2–4 players take turns (each has a fixed card along the
// bottom, as in Defeat the Monster and Gummy the Fisherman): a right answer gives hops, the player taps HOP to jump
// forward one row at a time through roads, railways and lily-pad rivers. Nobody dies: a car, a train or the water only
// knocks you back to the last grass you stood on. The first one to reach the ice-cream van wins.
// The world is three.js boxes (voxels); the canvas is drawn at half resolution and scaled up without smoothing,
// which gives the pixel look. Questions: the A0–A2 packages (packages.js) and the shared package browser.
import * as THREE from './lib/three.module.min.js';

// ---------- small helpers
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick1 = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const QS = new URLSearchParams(location.search);
// SOLO: the one-player phone version (fugio.co/hop/solo): you against three computer rivals, one question after another
const SOLO = QS.has('solo') || /\/solo\/?$/.test(location.pathname);
if (SOLO) document.body.classList.add('solo');
// localStorage can be missing or throw (private windows): the game then simply doesn't remember
const store = {
  get(k, d) { try { const v = localStorage.getItem('hoprush.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('hoprush.' + k, JSON.stringify(v)); } catch {} },
};

// ---------- the characters, built from boxes: [x, y, z, width, height, depth, colour] in voxels (y = bottom of the box).
// They face +z (towards the camera). Drawn from the original character pictures (Foxino/Original Characters) at about twice the
// detail of the first version; Foxino Character Creation Rules: Pix's eyes are never drawn, her bangs cover them.
const W_ = '#ffffff', K_ = '#2b1b2e';
const MODELS = {
  foxino: (() => { const P = '#8a52d1', Pd = '#6b3fb0', O = '#f28a2e', C = '#fff1dc', Y = '#ffd23a', OS = '#f07a1f', OSd = '#d4651a', GE = '#3fbf6a', TQ = '#3fd9b8'; return [
    // feet (cream paws) and legs
    [-1.4, 0, .4, 1.9, .9, 2.8, C], [1.4, 0, .4, 1.9, .9, 2.8, C], [-1.4, .9, 0, 1.5, 1.8, 1.6, P], [1.4, .9, 0, 1.5, 1.8, 1.6, P],
    // orange cargo shorts with side pockets
    [0, 2.7, 0, 5, 1.8, 3.2, OS], [-2.65, 2.9, .3, .5, 1.1, 1.5, OSd], [2.65, 2.9, .3, .5, 1.1, 1.5, OSd], [0, 4.3, 1.62, 5, .25, .1, OSd],
    // yellow T-shirt, sleeves, a cream collar
    [0, 4.5, 0, 5.4, 2.9, 3.4, Y], [-3.1, 5.6, 0, 1.2, 1.8, 2, Y], [3.1, 5.6, 0, 1.2, 1.8, 2, Y], [0, 7.1, 0, 2.2, .4, 2.4, C],
    // arms, the teal watch on the left wrist
    [-3.2, 3.9, 0, 1, 1.8, 1.4, P], [3.2, 3.9, 0, 1, 1.8, 1.4, P], [-3.2, 4.55, 0, 1.12, .4, 1.52, TQ], [-3.2, 4.6, .78, .5, .3, .1, K_],
    // head, cheek tufts, the orange blaze down the forehead
    [0, 7.4, 0, 6.6, 4.8, 5.4, P], [-3.45, 7.5, 1.2, .5, 1.6, 1.8, C], [3.45, 7.5, 1.2, .5, 1.6, 1.8, C],
    [0, 9.3, 2.72, 1.5, 2.9, .1, O], [-2.2, 7.4, 1.8, 2.2, 1.6, 1.9, O], [2.2, 7.4, 1.8, 2.2, 1.6, 1.9, O],
    // muzzle, nose, mouth, one fang
    [0, 7.6, 2.7, 3, 1.8, 1.2, C], [0, 9.1, 3.2, 1.1, .8, .5, K_], [0, 7.9, 3.35, 1.4, .3, .1, K_], [.45, 7.65, 3.33, .3, .3, .1, W_],
    // green eyes with a highlight, dark brows
    [-1.6, 9.4, 2.75, 1.6, 1.7, .2, W_], [1.6, 9.4, 2.75, 1.6, 1.7, .2, W_], [-1.4, 9.5, 2.85, 1, 1.2, .2, GE], [1.4, 9.5, 2.85, 1, 1.2, .2, GE],
    [-1.3, 9.8, 2.95, .5, .6, .1, K_], [1.3, 9.8, 2.95, .5, .6, .1, K_], [-1.05, 10.35, 3.0, .3, .3, .08, W_], [1.55, 10.35, 3.0, .3, .3, .08, W_],
    [-1.6, 11.25, 2.78, 1.5, .3, .15, '#5a2e8e'], [1.6, 11.25, 2.78, 1.5, .3, .15, '#5a2e8e'],
    // the orange hair tuft swept to the right
    [.4, 12.2, .4, 3.4, 1, 3.6, O], [1.3, 12.9, 1.0, 1.8, .9, 2.0, O], [2.1, 13.1, 1.9, 1.0, .6, 1.2, O], [2.6, 12.6, 2.3, .8, .5, .9, O],
    // big pointed ears, orange inside
    [-2.4, 12.2, 0, 1.9, 1.4, 1.2, P], [-2.5, 13.6, 0, 1.3, 1.2, 1.0, P], [-2.6, 14.8, 0, .7, .9, .8, P], [-2.4, 12.4, .62, 1.0, 1.1, .1, O], [-2.5, 13.7, .52, .6, .8, .1, O],
    [2.4, 12.2, 0, 1.9, 1.4, 1.2, P], [2.5, 13.6, 0, 1.3, 1.2, 1.0, P], [2.6, 14.8, 0, .7, .9, .8, P], [2.4, 12.4, .62, 1.0, 1.1, .1, O], [2.5, 13.7, .52, .6, .8, .1, O],
    // the tail: purple, an orange band, a cream tip
    [0, 2.6, -2.6, 2.4, 2.4, 2.2, P], [0, 3.6, -4.2, 3.0, 3.0, 2, P], [0, 4.7, -5.5, 2.8, 2.6, 1.4, O], [0, 5.9, -6.5, 2.2, 2.2, 1.2, C],
  ]; })(),
  stella: (() => { const SO = '#f2862a', SOd = '#d86a1a', SB = '#3b6fd1', SBd = '#2c56a8', SP = '#9b4fe0', TE = '#1fb5b0', C = '#fff1dc', BR = '#e2701c', Y = '#ffd23a'; return [
    // cream paws, orange legs
    [-1.4, 0, .4, 1.9, .9, 2.8, C], [1.4, 0, .4, 1.9, .9, 2.8, C], [-1.4, .9, 0, 1.5, 1.6, 1.6, SO], [1.4, .9, 0, 1.5, 1.6, 1.6, SO],
    // blue overall shorts with rolled cuffs, white T-shirt, the bib with straps, buttons and a yellow star
    [0, 2.5, 0, 5, 2, 3.2, SB], [-1.3, 2.5, 0, 2.3, .5, 3.3, SBd], [1.3, 2.5, 0, 2.3, .5, 3.3, SBd],
    [0, 4.5, 0, 5.2, 2.7, 3.2, W_], [0, 4.5, 1.55, 3.2, 2.4, .3, SB], [-1.9, 4.5, 1.55, .7, 2.7, .3, SBd], [1.9, 4.5, 1.55, .7, 2.7, .3, SBd],
    [-1.3, 6.5, 1.72, .5, .4, .1, Y], [1.3, 6.5, 1.72, .5, .4, .1, Y], [0, 5.3, 1.75, 1.3, .5, .12, Y], [0, 5.0, 1.75, .5, 1.1, .12, Y],
    // sleeves and arms
    [-3, 5.4, 0, 1.1, 1.6, 1.8, W_], [3, 5.4, 0, 1.1, 1.6, 1.8, W_], [-3.1, 3.8, 0, .9, 1.7, 1.3, SO], [3.1, 3.8, 0, .9, 1.7, 1.3, SO],
    // head, cheek tufts, muzzle, nose, open smiling mouth with a fang
    [0, 7.2, 0, 6.6, 4.8, 5.4, SO], [-3.45, 7.3, 1.2, .5, 1.6, 1.8, C], [3.45, 7.3, 1.2, .5, 1.6, 1.8, C],
    [0, 7.3, 2.6, 3.6, 1.9, 1.1, C], [-2.3, 7.3, 2.1, 1.6, 1.4, 1.2, C], [2.3, 7.3, 2.1, 1.6, 1.4, 1.2, C],
    [0, 8.9, 3.1, 1, .7, .5, K_], [0, 7.6, 3.18, 1.6, .5, .1, '#b8323c'], [-.45, 7.85, 3.22, .3, .3, .08, W_],
    // big teal eyes with lashes and highlights, the purple blaze between them
    [-1.6, 9.1, 2.75, 1.8, 2, .2, W_], [1.6, 9.1, 2.75, 1.8, 2, .2, W_], [-1.5, 9.2, 2.85, 1.2, 1.5, .2, TE], [1.5, 9.2, 2.85, 1.2, 1.5, .2, TE],
    [-1.4, 9.6, 2.95, .5, .6, .1, K_], [1.4, 9.6, 2.95, .5, .6, .1, K_], [-1.1, 10.25, 3.0, .3, .3, .08, W_], [1.85, 10.25, 3.0, .3, .3, .08, W_],
    [-1.6, 11.1, 2.8, 2, .3, .2, K_], [1.6, 11.1, 2.8, 2, .3, .2, K_], [-2.55, 10.9, 2.8, .3, .4, .15, K_], [2.55, 10.9, 2.8, .3, .4, .15, K_],
    [0, 9.4, 2.72, .9, 2.6, .1, SP],
    // hair: an orange swoop with a purple streak, a fringe over the right brow
    [-.9, 11.8, .2, 2.2, .8, 5.2, SP], [.8, 11.8, 0, 3, .8, 5, SO], [1.6, 12.5, .6, 2.0, .6, 3.0, SO], [-.4, 12.5, 1.2, 1.6, .5, 2.4, SP], [-1.2, 10.9, 2.65, 1.6, 1, .3, SP],
    // ears, cream inside
    [-2.4, 12, 0, 1.9, 1.4, 1.2, SO], [-2.5, 13.4, 0, 1.3, 1.2, 1.0, SO], [-2.6, 14.6, 0, .7, .8, .8, SO], [-2.4, 12.2, .62, 1.0, 1.1, .1, C], [-2.5, 13.5, .52, .6, .8, .1, C],
    [2.4, 12, 0, 1.9, 1.4, 1.2, SO], [2.5, 13.4, 0, 1.3, 1.2, 1.0, SO], [2.6, 14.6, 0, .7, .8, .8, SO], [2.4, 12.2, .62, 1.0, 1.1, .1, C], [2.5, 13.5, .52, .6, .8, .1, C],
    // the long side braid, orange and purple twists, a purple band and a tuft at the end
    [-3.5, 9.2, .5, 1.4, 1.5, 1.4, BR], [-3.7, 8.0, .7, 1.3, 1.3, 1.3, SP], [-3.8, 6.8, .8, 1.3, 1.3, 1.3, BR], [-3.9, 5.6, .8, 1.2, 1.3, 1.2, SP],
    [-3.9, 4.7, .8, 1.0, 1.0, 1.0, BR], [-3.9, 4.1, .8, 1.1, .6, 1.1, '#6a35c0'], [-3.9, 3.0, .9, 1.0, 1.1, 1.0, BR],
    // the tail: orange, a purple band, a cream tip
    [0, 2.4, -2.6, 2.4, 2.4, 2.2, SO], [0, 3.4, -4.2, 3.2, 3.2, 2, SO], [0, 4.5, -5.5, 2.8, 2.6, 1.4, SP], [0, 5.7, -6.5, 2.2, 2.2, 1.2, C],
  ]; })(),
  pix: (() => { const PG = '#86cf63', PH = '#a6e84a', PHd = '#8fd23c', PC = '#6a3fb5', PCd = '#56309c', PO = '#f08a24', PGr = '#7d7f88', PGrd = '#696b74', SL = '#c0c4cc'; return [
    // purple trainers with orange laces, baggy grey cargo pants with knee pads
    [-1.3, 0, .4, 1.9, 1, 2.8, '#5b3aa0'], [1.3, 0, .4, 1.9, 1, 2.8, '#5b3aa0'], [-1.3, .6, 1.75, 1.9, .4, .2, PO], [1.3, .6, 1.75, 1.9, .4, .2, PO],
    [-1.3, 1, 0, 2, 3.2, 2.2, PGr], [1.3, 1, 0, 2, 3.2, 2.2, PGr], [-1.3, 1.0, .2, 2.2, .6, 2.4, PGrd], [1.3, 1.0, .2, 2.2, .6, 2.4, PGrd],
    [-1.3, 2.0, 1.15, 1.7, 1.2, .3, PC], [1.3, 2.0, 1.15, 1.7, 1.2, .3, PC], [-1.3, 2.2, 1.32, .9, .8, .1, SL], [1.3, 2.2, 1.32, .9, .8, .1, SL],
    // orange tool belt: buckle, wrench on the left hip, pouch on the right
    [0, 4.1, 0, 4.8, .8, 2.6, PO], [0, 4.2, 1.33, .9, .6, .1, SL], [-2.1, 3.1, .9, .45, 1.8, .45, SL], [-2.1, 4.85, .9, .9, .5, .45, SL], [-2.1, 4.95, .9, .35, .35, .5, PO],
    [2.3, 3.3, .7, .9, 1.0, 1.0, PO], [2.3, 4.2, .7, 1.0, .3, 1.1, '#c96f1c'],
    // green midriff, white crop top with an orange badge, purple hoodie shoulders, sleeves, drawstrings, hood
    [0, 4.9, 0, 4.2, .8, 2.3, PG], [0, 5.7, 0, 4.6, 1.3, 2.7, '#f4f4f4'], [0, 5.9, 1.38, .9, .25, .1, PO], [0, 6.9, 0, 5, 1.1, 2.9, PC],
    [-2.9, 5.9, 0, 1.2, 2.1, 1.5, PC], [2.9, 5.9, 0, 1.2, 2.1, 1.5, PC], [-2.9, 4.3, 0, .9, 1.6, 1.1, PG], [2.9, 4.3, 0, .9, 1.6, 1.1, PG],
    [-.5, 6.1, 1.48, .2, 1.0, .1, W_], [.5, 6.1, 1.48, .2, 1.0, .1, W_], [0, 6.9, -1.7, 3.4, 1.2, 1.0, PCd],
    // green head, nose and mouth (no eyes: her bangs cover them), long pointed elf ears
    [0, 8, 0, 5.2, 4.4, 4.4, PG], [0, 8.6, 2.25, 1.4, .35, .15, '#3d2a2a'], [0, 9.3, 2.3, .6, .6, .3, '#72b552'], [-.9, 8.5, 2.22, .4, .3, .1, '#f0a0a0'], [.9, 8.5, 2.22, .4, .3, .1, '#f0a0a0'],
    [-3.3, 9.6, .4, 1, .9, .7, PG], [-4, 10.1, .3, .9, .7, .5, PG], [-4.65, 10.5, .2, .6, .5, .4, PG], [3.3, 9.6, .4, 1, .9, .7, PG], [4, 10.1, .3, .9, .7, .5, PG], [4.65, 10.5, .2, .6, .5, .4, PG],
    // lime hair: down the back past her shoulders, the sides, and the jagged bangs that always cover her eyes
    [0, 6.6, -2.1, 6, 6, 1.4, PH], [0, 4.4, -2.0, 4.8, 2.3, 1.0, PH], [-2.95, 7.6, .2, .8, 4.8, 4.4, PH], [2.95, 7.6, .2, .8, 4.8, 4.4, PH],
    [0, 10, 2.45, 5.8, 2.4, .6, PHd], [-1.9, 9.5, 2.5, 1.0, .6, .5, PHd], [-.5, 9.6, 2.5, .9, .5, .5, PHd], [.8, 9.5, 2.5, .8, .6, .5, PHd], [2.0, 9.65, 2.5, .9, .45, .5, PHd],
    [0, 12.2, 0, 5.6, .6, 4.6, PH],
    // the purple cap: crown, button, grey badge, orange brim
    [0, 12.6, 0, 5.8, 1.5, 5, PC], [0, 13.9, 0, 4.4, .5, 3.8, PC], [0, 14.3, 0, .8, .4, .8, '#8a63d0'], [0, 13.0, 2.52, .9, .7, .1, '#9a8ccc'], [0, 12.6, 3.1, 5, .45, 1.9, PO],
  ]; })(),
  rob: (() => { const RC = '#3cc7f0', RCd = '#2a3f8f', NV = '#3b2a8a', RS = '#101828', RE = '#a6f4ff', RO = '#ffa53a', H = '#ff3b5c', BK = '#1a1a22'; return [
    // boots and short legs
    [-1.6, 0, .3, 2.2, 1, 2.8, RCd], [1.6, 0, .3, 2.2, 1, 2.8, RCd], [-1.6, .3, 1.75, 1.4, .3, .1, RO], [1.6, .3, 1.75, 1.4, .3, .1, RO], [-1.6, 1, 0, 1.7, 1.4, 1.7, RC], [1.6, 1, 0, 1.7, 1.4, 1.7, RC],
    // the round body in layers, a navy belt band, the orange battery window with the yellow bolt
    [0, 2.4, 0, 5.6, 1.0, 4.6, RC], [0, 3.0, 0, 6.6, 4.0, 5.6, RC], [0, 3.3, 0, 7.4, 3.2, 4.8, RC], [0, 2.9, 0, 5.6, 4.2, 6.4, RC], [0, 6.8, 0, 5.4, .8, 4.4, RC],
    [0, 4.9, 0, 6.7, .35, 5.7, NV], [0, 2.6, 0, 6.0, .3, 5.0, NV],
    [0, 3.3, 3.1, 3.8, 3.2, .3, '#1b2740'], [0, 3.6, 3.2, 3.0, 2.6, .3, RO], [0, 4.1, 3.3, .9, 1.5, .2, '#fff1a8'], [.25, 4.5, 3.38, .4, .5, .08, '#ffd23a'], [-.25, 4.1, 3.38, .4, .5, .08, '#ffd23a'],
    // arms: cyan shoulders, navy rings, black three-finger hands
    [-4.3, 4.3, 0, 1.4, 2.4, 1.8, RC], [4.3, 4.3, 0, 1.4, 2.4, 1.8, RC], [-4.3, 3.7, 0, 1.5, .5, 1.9, NV], [4.3, 3.7, 0, 1.5, .5, 1.9, NV],
    [-4.3, 2.6, 0, 1.3, 1.1, 1.4, BK], [4.3, 2.6, 0, 1.3, 1.1, 1.4, BK], [-4.3, 2.3, .5, .9, .4, .5, BK], [4.3, 2.3, .5, .9, .4, .5, BK],
    // neck, the domed head, the black screen face with smiling eyes
    [0, 7.6, 0, 2.0, .5, 2.0, RCd], [0, 8, 0, 6.2, 4.6, 5.4, RC], [0, 8.4, 0, 6.8, 3.8, 4.6, RC], [0, 12.3, 0, 4.6, .5, 3.8, RC], [0, 8.6, 2.65, 5, 3.3, .3, RS],
    [-1.4, 10.1, 2.85, 1, .4, .1, RE], [-2, 9.7, 2.85, .4, .5, .1, RE], [-.8, 9.7, 2.85, .4, .5, .1, RE],
    [1.4, 10.1, 2.85, 1, .4, .1, RE], [.8, 9.7, 2.85, .4, .5, .1, RE], [2, 9.7, 2.85, .4, .5, .1, RE],
    // ear discs: orange ring, white centre
    [-3.5, 9.1, 0, .5, 2.4, 2.4, RO], [3.5, 9.1, 0, .5, 2.4, 2.4, RO], [-3.8, 9.6, 0, .2, 1.4, 1.4, W_], [3.8, 9.6, 0, .2, 1.4, 1.4, W_],
    // antenna with the red heart
    [0, 12.6, 0, 1.4, .5, 1.4, RCd], [0, 13.0, 0, .4, 1.3, .4, RCd],
    [-.35, 14.6, 0, .7, .7, .5, H], [.35, 14.6, 0, .7, .7, .5, H], [0, 14.1, 0, .8, .6, .5, H], [0, 13.8, 0, .4, .4, .5, H],
  ]; })(),
  gummy: (() => { const GP = '#ff5fb8', GB = '#5aa7ff', GPd = '#e04a9c', EP = '#7a3fd0', EO = '#ff8a1e'; return [
    // long thin legs with blue swirls, pink feet with a blue toe
    [-1.1, 0, .4, 1.8, .9, 2.6, GP], [1.1, 0, .4, 1.8, .9, 2.6, GP], [-1.1, .1, 1.6, 1.0, .5, .5, GB], [1.1, .1, 1.6, 1.0, .5, .5, GB],
    [-1.1, .9, 0, .9, 2.3, .9, GP], [1.1, .9, 0, .9, 2.3, .9, GP], [-1.1, 1.9, .3, .95, .5, .5, GB], [1.1, 2.3, -.3, .95, .5, .5, GB],
    [-1.1, 3.2, 0, .95, 1, .95, GB], [1.1, 3.2, 0, .95, 1, .95, GB], [-1.1, 4.2, 0, .9, 1.8, .9, GP], [1.1, 4.2, 0, .9, 1.8, .9, GP],
    // slim body with a blue stripe
    [0, 6, 0, 3, 1.2, 2, GP], [0, 7.2, 0, 2.8, 1, 1.9, GB], [0, 8.2, 0, 2.6, 1.4, 1.8, GP], [.6, 8.4, 1.0, .5, 1.0, .1, GB],
    // thin arms with blue bands and three-finger hands
    [-1.9, 6.2, 0, .8, 3.2, .8, GP], [1.9, 6.2, 0, .8, 3.2, .8, GP], [-1.9, 7.2, 0, .85, .6, .85, GB], [1.9, 7.2, 0, .85, .6, .85, GB],
    [-1.9, 5.5, .1, 1, .8, 1, GPd], [1.9, 5.5, .1, 1, .8, 1, GPd], [-2.1, 5.2, .5, .4, .5, .4, GPd], [2.1, 5.2, .5, .4, .5, .4, GPd],
    // neck, head, a blue swirl on top
    [0, 9.6, 0, 1, .8, 1, GP], [0, 10.4, 0, 5.2, 4, 4.2, GP], [0, 13.6, -.4, 4, .6, 3.4, GB], [1.4, 11.0, -2.2, 1.2, 1.6, .2, GB],
    // huge eyes: purple on her left, orange on her right (as in the original), little lashes, brows
    [-1.25, 11.2, 2.15, 2.1, 2.3, .2, W_], [1.25, 11.2, 2.15, 2.1, 2.3, .2, W_], [-1.1, 11.4, 2.25, 1.3, 1.5, .2, EP], [1.1, 11.4, 2.25, 1.3, 1.5, .2, EO],
    [-.95, 12.1, 2.35, .5, .5, .1, W_], [1.25, 12.1, 2.35, .5, .5, .1, W_], [-.9, 11.6, 2.4, .5, .5, .1, K_], [1.3, 11.6, 2.4, .5, .5, .1, K_],
    [-1.3, 13.5, 2.2, 1.6, .3, .15, EP], [1.3, 13.5, 2.2, 1.6, .3, .15, EP],
    // wide grin with two buck teeth
    [0, 10.4, 2.15, 3.0, .7, .2, '#5a1638'], [0, 10.5, 2.2, 3.4, .25, .15, '#5a1638'], [-.35, 10.0, 2.25, .6, .8, .2, W_], [.35, 10.0, 2.25, .6, .8, .2, W_],
    // curly antennae, pink stalks with blue tips
    [-1.4, 14.4, 0, .5, 1.4, .5, GP], [-1.9, 15.6, 0, 1.2, .5, .5, GP], [-2.3, 15, 0, .5, .8, .5, GB], [-1.9, 14.8, 0, .5, .4, .5, GB],
    [1.4, 14.4, 0, .5, 1.4, .5, GP], [1.9, 15.6, 0, 1.2, .5, .5, GP], [2.3, 15, 0, .5, .8, .5, GB], [1.9, 14.8, 0, .5, .4, .5, GB],
    [0, 14.2, .6, .5, 1.1, .5, GP], [.4, 15.1, .6, .9, .4, .5, GB],
  ]; })(),
  ghost: (() => { const GL = '#cbbfe9', GLd = '#a99bd0', GH = '#6d4bb3', GHd = '#5a3b9c', GK = '#1c1c24', GKl = '#2b2b33', OX = '#ff8a2a'; return [
    // the wispy tail instead of legs
    [.6, 0, -.6, 1, .8, 1, GL], [0, .6, -.2, 1.8, 1.2, 1.8, GL], [0, 1.6, 0, 3.4, 1.2, 3, GL],
    // black hoodie: body, hood behind, pocket, drawstrings, the white ghost skull on the left sleeve
    [0, 2.4, 0, 6, 4.2, 4, GK], [0, 6.4, -2.3, 6.2, 4.4, 1.2, GK], [0, 2.6, 2.05, 3.2, 1.0, .1, GKl], [-.6, 4.8, 2.08, .2, 1.2, .1, W_], [.6, 4.8, 2.08, .2, 1.2, .1, W_],
    [-3.15, 3.2, 0, 1.0, 4.0, 2.4, GK], [3.15, 3.2, 0, 1.0, 4.0, 2.4, GK],
    [-3.68, 4.6, .2, .1, 1.0, 1.0, W_], [-3.68, 4.3, .2, .1, .3, .6, W_], [-3.7, 4.9, .4, .1, .3, .3, GK], [-3.7, 4.9, -.1, .1, .3, .3, GK],
    // the game controller in both hands, an orange light bar
    [0, 2.9, 2.4, 2.8, .8, 1, GKl], [.8, 3.2, 2.9, .5, .3, .1, OX], [-.8, 3.3, 2.9, .4, .3, .1, '#5a5a66'], [-1.6, 2.8, 2.3, 1, 1, 1, GL], [1.6, 2.8, 2.3, 1, 1, 1, GL],
    // lavender head and face: sleepy half-closed eyes, dark lids, a small smirk
    [0, 6.6, 0, 5.6, 4.2, 4.4, GL],
    [-1.3, 8, 2.25, 1.7, 1, .2, W_], [1.3, 8, 2.25, 1.7, 1, .2, W_], [-1.2, 8, 2.35, .8, .6, .1, '#2b2240'], [1.4, 8, 2.35, .8, .6, .1, '#2b2240'],
    [-1.3, 8.6, 2.4, 1.9, .5, .15, GLd], [1.3, 8.6, 2.4, 1.9, .5, .15, GLd], [-1.3, 9.1, 2.3, 1.6, .25, .12, '#3a2d55'], [1.3, 9.1, 2.3, 1.6, .25, .12, '#3a2d55'],
    [.3, 7.2, 2.3, 1.2, .25, .1, '#6a5a90'], [.95, 7.3, 2.3, .3, .3, .1, '#6a5a90'],
    // messy purple hair, spikes all round
    [0, 10.6, 0, 6, 1.4, 4.8, GH], [-1.6, 12, .4, 1.4, 1, 1.4, GH], [.6, 12, -.6, 1.6, 1.2, 1.6, GH], [2.2, 11.8, .8, 1.2, .8, 1.2, GH], [-.4, 12.6, -1.4, 1.0, .9, 1.0, GHd], [1.9, 12.4, -1.6, .9, .7, .9, GH],
    [-1.2, 9.6, 2.3, 3.2, 1.1, .6, GH], [1.7, 9.8, 2.3, 1.6, .9, .6, GH], [-2.4, 9.4, 1.6, .8, .9, .9, GHd], [2.8, 9.6, 1.4, .7, .8, .8, GHd],
    // headphones: band over the hair, cups with the orange X
    [0, 11.9, 0, 6.8, .6, 1, GK], [-3.3, 10.4, 0, .4, 1.6, .8, GK], [3.3, 10.4, 0, .4, 1.6, .8, GK], [-3.4, 7.6, 0, 1.0, 2.8, 2.8, GK], [3.4, 7.6, 0, 1.0, 2.8, 2.8, GK],
    [-3.92, 8.4, 0, .1, 1.2, .35, OX], [-3.92, 8.4, 0, .1, .35, 1.2, OX], [3.92, 8.4, 0, .1, 1.2, .35, OX], [3.92, 8.4, 0, .1, .35, 1.2, OX],
  ]; })(),
};
const CREW = [
  {id: 'foxino', name: 'Foxino', ring: '#ffa23d'},
  {id: 'stella', name: 'Stella', ring: '#b07cff'},
  {id: 'pix', name: 'Pix', ring: '#56e08a'},
  {id: 'rob', name: 'Rob', ring: '#4fc3ff'},
  {id: 'gummy', name: 'Gummy', ring: '#ff6fd0'},
  {id: 'ghost', name: 'Ghost', ring: '#dfe8f6', float: true},
];
const crewOf = (id) => CREW.find((c) => c.id === id) || CREW[0];
const VOX = .082; // one voxel of a character, in road tiles

// boxes → one geometry with a colour per vertex, so a whole car / tree / character is drawn in one go
const _c = new THREE.Color();
// (v15) world boxes (u = 1) get a darker bottom edge (fake ambient occlusion), which grounds trees, cars and the van
function boxesGeo(list, u = 1, ao = u === 1) {
  const pos = [], nor = [], col = [], idx = [];
  for (const [x, y, z, w, h, d, hex] of list) {
    const g = new THREE.BoxGeometry(w * u, h * u, d * u); g.translate(x * u, (y + h / 2) * u, z * u);
    const p = g.attributes.position.array, n = g.attributes.normal.array, base = pos.length / 3, bot = y * u + 1e-4, dk = ao && h * u > .2;
    _c.set(hex);
    for (let i = 0; i < p.length; i += 3) { const k = dk && p[i + 1] < bot ? .74 : 1; pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(_c.r * k, _c.g * k, _c.b * k); }
    for (const i of g.index.array) idx.push(base + i);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}

// ---------- three.js: renderer, camera, light
const canvas = $('world');
// sharp: drawn at the screen's own resolution (up to 1.5× on retina screens) with smoothed edges; ?px=.5 gives the old chunky-pixel look
const PIX = clamp(+QS.get('px') || Math.min(devicePixelRatio || 1, 1.5), .2, 2);
const renderer = new THREE.WebGLRenderer({canvas, antialias: PIX >= 1, powerPreference: 'high-performance'});
renderer.setPixelRatio(PIX);
canvas.style.imageRendering = PIX < 1 ? 'pixelated' : 'auto';
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const HAZE = '#c4ecff';
const scene = new THREE.Scene(); scene.background = new THREE.Color(HAZE);
scene.fog = new THREE.Fog(HAZE, 20, 36); // far rows fade into a light-blue haze
const MAT = new THREE.MeshLambertMaterial({vertexColors: true});
// (v15) a warm sun and a cool sky fill, so the shadows read blue-ish and the lit sides warm
scene.add(new THREE.HemisphereLight(0xe4efff, 0x5f6aa6, 1.55));
const sun = new THREE.DirectionalLight(0xffe6c2, 2.3);
// a weak phone (few cores / little memory) starts with a smaller shadow map; autoQuality can lower it later too
const WEAK = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 3) || (matchMedia('(pointer:coarse)').matches && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
sun.castShadow = true; sun.shadow.mapSize.set(WEAK ? 1024 : 2048, WEAK ? 1024 : 2048); sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, {left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60});
sun.shadow.bias = -.0015;
scene.add(sun, sun.target);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 200);
const CAM_OFF = new THREE.Vector3(2.4, 8.5, 10);
const camAt = new THREE.Vector3(0, 0, 0), camGoal = new THREE.Vector3(0, 0, 0);
let FOCUS = .5; // where the followed character sits, from the top of the screen (the cards cover the bottom 40%)
let lobbyView = true, VIEW_W = 0, FOCUS_ICON = 0;
function fitView() {
  renderer.setSize(innerWidth, innerHeight, false);
  const a = innerWidth / innerHeight, vw = VIEW_W || (SOLO && a < 1 ? 8.8 : a < 1.2 ? 10.5 : a < 1.5 ? 13 : 15.5) * (lobbyView ? (SOLO && a < 1 ? 1.1 : 1.25) : 1), fh = vw / a;
  FOCUS = FOCUS_ICON || (lobbyView ? (SOLO && a >= 1 ? .5 : .32) : .5);   // (v13: solo sideways, the settings are a side column, so the racer sits mid-height)
  cam.left = -vw / 2; cam.right = vw / 2; cam.top = fh * FOCUS; cam.bottom = -fh * (1 - FOCUS); cam.updateProjectionMatrix();
}
addEventListener('resize', () => { fitView(); if (SOLO && lobbyView && !$('lobby').hidden && lobbyChars.length) placeLobbyChars(); });
fitView();

// ---------- the road: rows of grass, road, railway and river. Row START is the start line, START + len the finish.
const START = 6, HALF = 20, SPAN_MIN = 2 * HALF;
let rows = [], world = null, LEN = 40, FINISH = START + 40;
// (v12, class feedback: "it is far too long") the class race takes turns, so it is shorter: about 5, 8 and 11 crossings
// each; on your own (solo) you answer one question after another, so the road stays longer (about 8, 12 and 17)
const LENS = SOLO ? {short: 24, medium: 36, long: 52} : {short: 16, medium: 25, long: 36};
const GROUND = {grass: 0, finish: 0, road: -.08, rail: -.04, river: -.22};
const groundAt = (r) => GROUND[rows[r]?.type] ?? 0;
const CAR_COLS = ['#ff5a5f', '#ffb020', '#4f8cff', '#36c486', '#b06cff', '#ff7fc8', '#f2f2f2', '#25c6d8'];
const geoCache = new Map();
const cached = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const WHEELS = (xs, z = .42) => xs.flatMap((x) => [[x, 0, -z, .34, .32, .1, '#202230'], [x, 0, z, .34, .32, .1, '#202230']]);
const VEH = {
  car: {len: 1.4, geo: (c) => boxesGeo([[0, .12, 0, 1.4, .42, .84, c], [-.08, .54, 0, .86, .32, .76, '#bfe6ff'], [-.08, .86, 0, .9, .08, .8, c],
    [.71, .3, -.25, .04, .12, .18, '#fff6b0'], [.71, .3, .25, .04, .12, .18, '#fff6b0'], [-.71, .3, -.25, .04, .12, .18, '#ff4d4d'], [-.71, .3, .25, .04, .12, .18, '#ff4d4d'],
    ...WHEELS([-.42, .42])])},
  truck: {len: 2.4, geo: (c) => boxesGeo([[.82, .12, 0, .72, .82, .84, c], [1.19, .56, 0, .04, .28, .7, '#bfe6ff'], [-.38, .12, 0, 1.62, 1.08, .9, pick1(['#f4f4f4', '#ffd84d', '#9be37b'])],
    [-.38, .9, .455, 1.3, .12, .01, c], [1.19, .3, -.28, .04, .12, .16, '#fff6b0'], [1.19, .3, .28, .04, .12, .16, '#fff6b0'], ...WHEELS([-.85, -.25, .82])])},
  // (v15) more kinds of traffic: a taxi with its roof sign, a tall delivery van, a pickup with a load in the back
  taxi: {len: 1.45, geo: () => boxesGeo([[0, .12, 0, 1.45, .42, .84, '#ffcf26'], [-.08, .54, 0, .88, .32, .76, '#bfe6ff'], [-.08, .86, 0, .92, .08, .8, '#ffcf26'], [-.08, .94, 0, .34, .14, .3, '#ffffff'],
    [0, .32, .425, 1.2, .08, .01, '#20232e'], [.73, .3, -.25, .04, .12, .18, '#fff6b0'], [.73, .3, .25, .04, .12, .18, '#fff6b0'], [-.73, .3, -.25, .04, .12, .18, '#ff4d4d'], [-.73, .3, .25, .04, .12, .18, '#ff4d4d'], ...WHEELS([-.44, .44])])},
  van: {len: 1.8, geo: (c) => boxesGeo([[-.1, .12, 0, 1.6, .98, .86, '#f4f4f4'], [.62, .12, 0, .36, .62, .84, c], [.72, .5, 0, .2, .26, .74, '#bfe6ff'], [-.1, .6, .435, 1.1, .2, .01, c],
    [.81, .3, -.27, .04, .12, .16, '#fff6b0'], [.81, .3, .27, .04, .12, .16, '#fff6b0'], ...WHEELS([-.55, .55])])},
  pickup: {len: 1.9, geo: (c) => boxesGeo([[.35, .12, 0, .9, .74, .84, c], [.42, .5, 0, .5, .28, .78, '#bfe6ff'], [-.5, .12, 0, .86, .36, .84, c], [-.5, .48, 0, .78, .06, .76, '#5a3a24'],
    [-.62, .48, 0, .38, .3, .4, '#b07a3a'], [-.25, .48, .12, .26, .22, .3, '#9be37b'], [.82, .3, -.26, .04, .12, .16, '#fff6b0'], [.82, .3, .26, .04, .12, .16, '#fff6b0'], ...WHEELS([-.55, .5])])},
  bus: {len: 3, geo: () => boxesGeo([[0, .12, 0, 3, .98, .88, '#ffc93c'], [-.1, .6, 0, 2.6, .3, .9, '#bfe6ff'], [1.4, .6, 0, .22, .3, .9, '#bfe6ff'], [0, 1.1, 0, 2.8, .06, .8, '#f0b020'],
    [1.5, .28, -.3, .04, .12, .16, '#fff6b0'], [1.5, .28, .3, .04, .12, .16, '#fff6b0'], ...WHEELS([-1.05, 1.05])])},
};
const TRAIN_CAR = 2.95;
const trainGeo = (loco) => loco
  ? boxesGeo([[0, .1, 0, 2.8, 1.05, .92, '#e5484d'], [-.7, 1.15, 0, 1.3, .55, .92, '#c73a3f'], [-.7, 1.25, 0, 1.32, .25, .94, '#bfe6ff'],
    [.8, 1.15, 0, .3, .5, .3, '#30323d'], [1.41, .3, 0, .04, .25, .4, '#fff6b0'], [0, .25, 0, 2.82, .12, .94, '#30323d'], ...WHEELS([-1, -.35, .35, 1], .45)])
  : boxesGeo([[0, .1, 0, 2.8, 1.05, .9, '#f4efe6'], [0, .38, 0, 2.82, .14, .92, '#3a7bd5'], [0, .7, 0, 2.6, .26, .92, '#9fd3ff'], [0, 1.15, 0, 2.7, .06, .8, '#d8d2c6'],
    ...WHEELS([-1, -.4, .4, 1], .45)]);
const treeGeo = (k) => cached('tree' + k, () => k === 0
  ? boxesGeo([[0, 0, 0, .3, .45, .3, '#7a5230'], [0, .45, 0, .86, .7, .86, '#3fae49'], [0, 1.15, 0, .6, .38, .6, '#57c45a']])
  : k === 1 ? boxesGeo([[0, 0, 0, .3, .3, .3, '#7a5230'], [0, .3, 0, .8, .55, .8, '#3a9c43'], [0, .85, 0, .8, .55, .8, '#46b04e'], [0, 1.4, 0, .5, .4, .5, '#5cc55e']])
  : boxesGeo([[0, 0, 0, .7, .32, .6, '#9aa0ad'], [.08, .32, 0, .45, .18, .4, '#b4bac6']])); // a rock
const padGeo = cached('pad', () => boxesGeo([[0, 0, 0, .66, .1, .5, '#3fbf5a'], [0, 0, 0, .5, .1, .66, '#3fbf5a'], [.12, .01, .2, .2, .1, .14, '#2f8fe0'], [-.12, .1, -.08, .16, .08, .16, '#ffd6ef']]));
// water: a small drawn texture of ripples and sparkles, repeated along the river and slowly drifting
const waterTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#3399e8'; x.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 26; i++) { x.fillStyle = Math.random() < .5 ? '#5ab4f5' : '#2b86d6'; x.fillRect(Math.random() * 256, Math.random() * 64, 14 + Math.random() * 40, 3 + Math.random() * 3); }
  for (let i = 0; i < 10; i++) { x.fillStyle = '#d9f1ff'; x.fillRect(Math.random() * 256, Math.random() * 64, 6 + Math.random() * 10, 2); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(15, 1); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
})();
// a big field under everything, so there is grass behind the start line and beyond the edges too
const field = new THREE.Mesh(new THREE.PlaneGeometry(160, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({color: '#6cb83c'}));
field.position.set(0, -.62, -150); field.receiveShadow = true; scene.add(field);
const waterGeo = new THREE.PlaneGeometry(2 * HALF + 20, 1).rotateX(-Math.PI / 2);
const waterMats = [1, -1].map((d) => { const m = new THREE.MeshLambertMaterial({map: waterTex.clone()}); m.map.needsUpdate = true; m.userData.dir = d; return m; });
const waterMat = (r) => waterMats[r % 2];
// (v15) water shimmer: a see-through layer of light glints over every river, drifting and pulsing (additive, no extra light)
const GLINT_MAT = (() => {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const x = cv.getContext('2d');
  for (let i = 0; i < 18; i++) { x.fillStyle = Math.random() < .5 ? '#ffffff' : '#bfe9ff'; x.fillRect(Math.random() * 256, Math.random() * 32, 4 + Math.random() * 12, 2); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(11, 1); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map: t, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false});
})();
const LIGHT_ON = new THREE.MeshBasicMaterial({color: '#ff3030'}), LIGHT_OFF = new THREE.MeshLambertMaterial({color: '#4a1414'});
const lightGeo = new THREE.BoxGeometry(.24, .24, .1);

function planRows(len) {
  const types = [];
  for (let r = 0; r < START + 2; r++) types.push('grass');
  const end = START + len;
  let last = 'grass';
  while (types.length < end) {
    const r = types.length, p = (r - START) / len;
    const opts = [['road', 5], ['river', p > .1 ? 2.2 : 0], ['rail', p > .06 ? 1.8 : 0], ['grass', last === 'grass' ? 0 : .6]];
    let t = opts.reduce((s, o) => s + o[1], 0) * Math.random(), type = 'road';
    for (const [k, w] of opts) { if ((t -= w) < 0) { type = k; break; } }
    // (v12, class feedback: the crossings could be a little longer) roads of up to 2 lanes from the start and 3 later, rivers of 2 sooner
    let n = type === 'road' ? randi(1, 2 + (p > .45)) : type === 'river' ? randi(1, 1 + (p > .2)) : type === 'rail' ? (p > .45 && Math.random() < .4 ? 2 : 1) : 1;
    n = Math.min(n, end - r);
    for (let k = 0; k < n; k++) types.push(type);
    last = type;
    if (type !== 'grass' && types.length < end) { types.push('grass'); last = 'grass'; }
  }
  types.push('finish');
  for (let k = 0; k < 12; k++) types.push('grass');
  return types;
}

function buildWorld(len) {
  if (world) { scene.remove(world); world.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); }
  world = new THREE.Group(); scene.add(world);
  LEN = len; FINISH = START + len;
  const types = planRows(len);
  rows = types.map((type, r) => ({r, type}));
  const lanes = laneXs(4);
  rows.forEach((row) => {
    const r = row.r, p = clamp((r - START) / len, 0, 1), list = [];
    const prev = rows[r - 1]?.type, g = r % 2 ? '#86d64c' : '#7ccc45', gd = r % 2 ? '#6fbd3e' : '#67b339';
    if (row.type === 'grass' || row.type === 'finish') {
      for (let x = -7; x <= 7; x++) list.push([x, -.6, 0, 1, .6, 1, _c.set(g).offsetHSL(rand(-.008, .008), 0, rand(-.025, .025)).getHex()]);
      list.push([-17.5, -.6, 0, 20, .6, 1, gd], [17.5, -.6, 0, 20, .6, 1, gd]);
      const hz = (t) => t && t !== 'grass' && t !== 'finish';
      if (r >= START && hz(rows[r + 1]?.type)) list.push([0, 0, -.45, 15, .035, .1, '#e6ffc4']);
      if (r > START && hz(prev)) list.push([0, 0, .45, 15, .035, .1, '#e6ffc4']);
      // trees and rocks: never in a player's column
      const busy = (x) => lanes.some((lx) => Math.abs(lx - x) < .9);
      const dense = r < START || r > FINISH ? .32 : .2;
      for (let x = -13; x <= 13; x++) {
        if (busy(x) || (r >= START - 3 && r <= FINISH && Math.abs(x) < 4.5)) continue;
        if (Math.random() < dense) { const k = Math.random() < .14 ? 2 : Math.random() < .5 ? 0 : 1; const m = new THREE.Mesh(treeGeo(k), MAT); m.position.set(x, 0, 0); m.rotation.y = randi(0, 3) * Math.PI / 2; m.userData.sway = k < 2; m.castShadow = m.receiveShadow = true; row.decor = row.decor || []; row.decor.push(m); }
        else if (Math.random() < .08) list.push([x + rand(-.3, .3), 0, rand(-.3, .3), .14, .12, .14, pick1(['#fff36b', '#ff8ad8', '#ffffff'])]);
      }
      if (r === START) list.push([0, 0, -.47, 15, .02, .08, '#ffffff']);
      if (row.type === 'finish') {
        for (let x = -7.5; x < 7.5; x += .5) for (const z of [-.25, .25]) list.push([x + .25, 0, z, .5, .025, .5, ((x * 2 + (z > 0)) & 1) ? '#ffffff' : '#20232e']);
        list.push([-5.4, 0, 0, .4, 2.7, .4, '#ffffff'], [5.4, 0, 0, .4, 2.7, .4, '#ffffff'], [0, 2.3, 0, 11.2, .75, .22, '#ff4d6d'], [0, 2.45, .12, 10.6, .45, .02, '#ffd23f']);
        for (let x = -4.8; x <= 4.8; x += 1.2) list.push([x, 2.52, .13, .5, .3, .02, '#ff4d6d']);
      }
      if (r === FINISH + 3) { // the ice-cream van everybody is racing to
        list.push([0, .12, 0, 3, 1.35, 1.3, '#ffb3d9'], [-.4, .7, .66, 1.8, .55, .02, '#6a3fb5'], [1.1, .75, 0, .6, .4, 1.32, '#bfe6ff'], [0, .2, 0, 3.04, .2, 1.34, '#ff5fb8'],
          [-.2, 1.47, 0, .5, .3, .5, '#e8b06a'], [-.2, 1.77, 0, .7, .3, .7, '#e8b06a'], [-.2, 2.07, 0, .8, .5, .8, '#ff8ad8'], [-.2, 2.57, 0, .55, .35, .55, '#fff4f9'], [-.2, 2.92, 0, .18, .18, .18, '#ff3b5c'],
          ...WHEELS([-.9, .9], .6));
      }
    } else if (row.type === 'road') {
      list.push([0, -.68, 0, 2 * HALF + 20, .6, 1, '#4b4f5c']);
      if (prev === 'road') for (let x = -HALF; x < HALF; x += 2) list.push([x, -.085, .5, .8, .02, .09, '#e8e8e8']);
      if (prev !== 'road') list.push([0, -.085, .47, 2 * HALF + 20, .03, .06, '#c9ccd6']);
      if (rows[r + 1]?.type !== 'road') list.push([0, -.085, -.47, 2 * HALF + 20, .03, .06, '#c9ccd6']);
      row.dir = Math.random() < .5 ? 1 : -1;
      row.speed = 1.4 + 2 * p + rand(0, .6);
      row.cars = [];
      let x = -HALF + rand(0, 3);
      const gapMin = Math.max(2.9, 3.8 - p), gapMax = Math.max(5.5, 8.5 - 2.5 * p);
      while (x < HALF - 1) {
        const kind = Math.random() < .74 - .14 * p ? pick1(['car', 'car', 'car', 'car', 'taxi', 'van', 'pickup']) : Math.random() < .65 ? 'truck' : 'bus', V = VEH[kind];
        const col = pick1(CAR_COLS), m = new THREE.Mesh(cached(kind === 'taxi' ? kind : kind + col, () => V.geo(col)), MAT);
        m.castShadow = true; m.rotation.y = row.dir > 0 ? 0 : Math.PI;
        row.cars.push({x0: x + V.len / 2, len: V.len, m, honk: 0});
        x += V.len + rand(gapMin, gapMax);
      }
      row.span = Math.max(SPAN_MIN, x + HALF);
    } else if (row.type === 'rail') {
      list.push([0, -.64, 0, 2 * HALF + 20, .6, 1, '#9a8a74']);
      for (let x = -HALF; x < HALF; x += .7) list.push([x, -.04, 0, .26, .05, .88, '#6e4a2c']);
      list.push([0, .01, -.26, 2 * HALF + 20, .07, .07, '#cfd4dc'], [0, .01, .26, 2 * HALF + 20, .07, .07, '#cfd4dc']);
      list.push([-5.2, 0, .44, .14, 1.5, .14, '#30323d'], [-5.2, 1.5, .44, .7, .34, .14, '#30323d']); // the signal post
      row.lights = [-1, 1].map((k) => { const m = new THREE.Mesh(lightGeo, LIGHT_OFF); m.position.set(-5.2 + k * .17, 1.67, .53); return m; });
      row.dir = Math.random() < .5 ? 1 : -1;
      row.ncars = randi(4, 6);
      row.train = new THREE.Group();
      for (let k = 0; k < row.ncars; k++) {
        const m = new THREE.Mesh(cached(k ? 'tcar' : 'tloco', () => trainGeo(!k)), MAT);
        m.position.x = -k * TRAIN_CAR * row.dir; m.rotation.y = row.dir > 0 ? 0 : Math.PI; m.castShadow = true; row.train.add(m);
      }
      row.train.visible = false;
      row.tlen = row.ncars * TRAIN_CAR;
      row.next = rand(2, 7); row.tx = 0; row.on = false; row.speed = 18 + 6 * p;
      row.gap = [Math.max(5.5, 8 - 2.5 * p), Math.max(8, 12 - 3 * p)];
    } else if (row.type === 'river') {
      list.push([0, -.95, 0, 2 * HALF + 20, .6, 1, '#2f8fe0']);
      row.water = new THREE.Mesh(waterGeo, waterMat(r)); row.water.position.y = -.345; row.water.receiveShadow = true;
      row.glint = new THREE.Mesh(waterGeo, GLINT_MAT); row.glint.position.y = -.338;   // (v15) a sparkle layer drifting the other way
      if (prev !== 'river') list.push([0, -.36, .47, 2 * HALF + 20, .02, .06, '#bfe7ff']);
      row.period = rand(4.6, 6.2) - p * .8; row.down = 1.1 + .7 * p;
      row.pads = [];
      for (let x = -12; x <= 12; x++) {
        if (Math.abs(x) > 3 && Math.random() < .55) continue; // a pad on every player's column, a few more around them
        const m = new THREE.Mesh(padGeo, MAT); m.position.set(x, -.32, 0); m.rotation.y = randi(0, 3) * Math.PI / 2; m.receiveShadow = true;
        row.pads.push({x, m, off: rand(0, row.period)});
      }
    }
    const mesh = new THREE.Mesh(boxesGeo(list), MAT); mesh.userData.own = true;
    mesh.receiveShadow = true; mesh.castShadow = row.type === 'finish' || r === FINISH + 3;
    row.g = new THREE.Group(); row.g.position.z = -r; row.g.add(mesh);
    (row.decor || []).forEach((m) => row.g.add(m));
    row.cars?.forEach((c) => row.g.add(c.m));
    row.pads?.forEach((pd) => row.g.add(pd.m));
    if (row.train) row.g.add(row.train, ...row.lights);
    if (row.water) row.g.add(row.water, row.glint);
    world.add(row.g);
  });
}

// a lily pad is under water for the last `down` seconds of its cycle, and wobbles for .8 s before it goes
function padState(row, pd, t) {
  const ph = ((t + pd.off) % row.period + row.period) % row.period, dn = row.period - row.down;
  return ph > dn ? 'down' : ph > dn - .8 ? 'warn' : 'up';
}
const padAt = (row, x) => row.pads?.find((pd) => pd.x === Math.round(x));

let T = 0; // world clock, seconds (stops while the game is paused)
function updateRows(dt) {
  const near = (r) => Math.abs(r + camAt.z) < 22;
  for (const row of rows) {
    const vis = near(row.r); row.g.visible = vis;
    if (row.type === 'road') {
      for (const c of row.cars) {
        c.x = -HALF + (((c.x0 + HALF + row.dir * row.speed * T) % row.span) + row.span) % row.span;
        if (vis) { c.m.position.x = c.x; c.m.position.y = Math.abs(Math.sin(T * 11 + c.x0 * 3)) * .022; }   // (v15) a little bounce on the road
      }
    } else if (row.type === 'rail') {
      if (!row.on && T >= row.next) { row.on = true; row.tx = -row.dir * (HALF + 2); row.train.visible = true; if (vis && Math.abs(row.r + camAt.z) < 9) sfx.train(); }
      if (row.on) {
        row.tx += row.dir * row.speed * dt; row.train.position.x = row.tx;
        if (row.dir * row.tx > HALF + row.tlen + 2) { row.on = false; row.train.visible = false; row.next = T + rand(...row.gap); }
      }
      const warn = row.on || T > row.next - 2.2;
      const blink = warn && Math.floor(T * 4) % 2;
      row.lights[0].material = warn && blink ? LIGHT_ON : LIGHT_OFF; row.lights[1].material = warn && !blink ? LIGHT_ON : LIGHT_OFF;
      if (warn && !row.on && vis && Math.abs(row.r + camAt.z) < 8) { const k = Math.floor(T * 3); if (k !== row.ding) { row.ding = k; sfx.ding(); } }
    } else if (vis && row.decor && Math.abs(row.r + camAt.z) < 7 && (row.type === 'grass' || row.type === 'finish')) {
      for (const m of row.decor) if (m.userData.sway && Math.abs(m.position.x - camAt.x) < 8) m.rotation.z = Math.sin(T * 1.7 + m.position.x * .7 + row.r) * .03;   // (v15) trees near you sway a little
    } else if (row.type === 'river' && vis) {
      for (const pd of row.pads) {
        const s = padState(row, pd, T);
        pd.m.position.y = s === 'down' ? -.62 : -.32 + (s === 'warn' ? Math.sin(T * 30) * .025 : Math.sin(T * 2 + pd.x) * .012) - padDip(pd);
        pd.m.rotation.z = s === 'warn' ? Math.sin(T * 26) * .06 : 0;
      }
    }
  }
}
// the trains, cars or water at (row, x) right now: what would knock a character standing there
function danger(r, x) {
  const row = rows[r]; if (!row) return null;
  if (row.type === 'road') for (const c of row.cars) if (Math.abs(c.x - x) < c.len / 2 + .3) return 'car';
  if (row.type === 'rail' && row.on) {
    const head = row.tx + row.dir * TRAIN_CAR / 2, tail = head - row.dir * row.tlen;
    if (x > Math.min(head, tail) - .3 && x < Math.max(head, tail) + .3) return 'train';
  }
  if (row.type === 'river') { const pd = padAt(row, x); if (!pd || padState(row, pd, T) === 'down') return 'water'; }
  return null;
}

// ---------- character rigs: each model is split into parts that move around their joints (head, arms, legs, tail)
const RIG = {
  foxino: {headY: 7.4, legTop: 2.7, armX: 3, tail: (b) => b[2] <= -2.5, tailAt: [0, 3.6, -2.4]},
  stella: {headY: 7.2, legTop: 2.5, armX: 2.9, tail: (b) => b[2] <= -2.5, tailAt: [0, 3.4, -2.4], head: (b) => b[0] <= -3.4}, // her braid moves with her head
  pix: {headY: 7.6, legTop: 4.2, armX: 2.8, head: (b) => b[2] <= -1.5 && b[1] >= 6}, // her long hair too
  rob: {headY: 7.4, legTop: 2.4, armX: 3.9},
  gummy: {headY: 9.6, legTop: 6, armX: 1.7},
  ghost: {headY: 6.4, legTop: -1, arm: (b) => (Math.abs(b[0]) >= 1.5 && b[2] >= 2 && b[1] < 4) || (Math.abs(b[0]) >= 2.7 && b[1] < 6.4), tail: (b) => b[1] < 2.4, tailAt: [0, 2.4, 0]}, // a wispy tail, no legs
};
function rigParts(id) {
  return cached('rig' + id, () => {
    const cfg = RIG[id], groups = {};
    for (const b of MODELS[id]) {
      const [x, y, , , h] = b;
      const part = cfg.tail && cfg.tail(b) ? 'tail'
        : y >= cfg.headY || (cfg.head && cfg.head(b)) ? 'head'
        : y + h <= cfg.legTop + .01 ? (x < 0 ? 'legL' : 'legR')
        : (cfg.arm ? cfg.arm(b) : Math.abs(x) >= cfg.armX) ? (x < 0 ? 'armL' : 'armR')
        : 'body';
      (groups[part] = groups[part] || []).push(b);
    }
    const out = {};
    for (const [part, list] of Object.entries(groups)) {
      const ax = list.reduce((sum, b) => sum + b[0], 0) / list.length, top = Math.max(...list.map((b) => b[1] + b[4]));
      const at = part === 'head' ? [0, cfg.headY, 0] : part.startsWith('leg') ? [ax, cfg.legTop, 0] : part.startsWith('arm') ? [ax, top - .4, 0] : part === 'tail' ? cfg.tailAt : [0, 0, 0];
      out[part] = {at, geo: boxesGeo(list.map(([x, y, z, w, h, d, c]) => [x - at[0], y - at[1], z - at[2], w, h, d, c]), VOX)};
    }
    return out;
  });
}
function makeRig(id, shadows) {
  const root = new THREE.Group(), parts = {};
  for (const [part, {at, geo}] of Object.entries(rigParts(id))) {
    const g = new THREE.Group(); g.position.set(at[0] * VOX, at[1] * VOX, at[2] * VOX);
    const m = new THREE.Mesh(geo, MAT); if (shadows) m.castShadow = m.receiveShadow = true;
    g.add(m); root.add(g); parts[part] = g;
  }
  return {root, parts};
}
// poses at time t: 'idle' (breathing, looking round), 'run', 'air' (mid-jump), 'cheer' (arms up, waving), 'clap', 'sad', 'dizzy', 'flail'
function poseRig(rig, kind, t) {
  const P = rig.parts, s = Math.sin;
  for (const g of Object.values(P)) g.rotation.set(0, 0, 0);
  const arms = (l, r, fwd = 0) => { if (P.armL) P.armL.rotation.set(fwd, 0, -l); if (P.armR) P.armR.rotation.set(fwd, 0, r); };
  const legs = (a, b = -a) => { if (P.legL) P.legL.rotation.x = a; if (P.legR) P.legR.rotation.x = b; };
  const head = (x, y, z) => { if (P.head) P.head.rotation.set(x, y, z); };
  const tail = (a) => { if (P.tail) P.tail.rotation.y = a; };
  switch (kind) {
    case 'run': legs(s(t * 20) * .7); arms(.15, .15); if (P.armL) P.armL.rotation.x = -s(t * 20) * .7; if (P.armR) P.armR.rotation.x = s(t * 20) * .7; head(.06, 0, 0); tail(s(t * 20) * .5); break;
    case 'air': legs(-.55, -.55); arms(1.1, 1.1); head(-.1, 0, 0); tail(.3); break;
    case 'cheer': arms(2.5 + s(t * 11) * .35, 2.5 + s(t * 11 + 1.6) * .35); legs(s(t * 7) * .25); head(-.15, s(t * 2.3) * .3, s(t * 4) * .12); tail(s(t * 14) * .7); break;
    case 'clap': { const k = Math.abs(s(t * 9)); arms(.55 - k * .5, .55 - k * .5, -1.25); head(-.08, s(t * 1.7) * .25, 0); tail(s(t * 10) * .5); break; }
    case 'sad': arms(.04, .04); head(.42, s(t * 8) * .25 * Math.max(0, 1 - t * .6), 0); tail(-.2); break;
    case 'dizzy': head(0, 0, s(t * 9) * .3); arms(.6 + s(t * 9) * .3, .6 - s(t * 9) * .3); tail(s(t * 9) * .6); break;
    case 'flail': arms(2 + s(t * 25) * .6, 2 + s(t * 25 + 2) * .6); legs(s(t * 25) * .6); tail(s(t * 25)); break;
    default: arms(.06 + s(t * 2) * .04, .06 + s(t * 2 + 1) * .04); head(s(t * .9) * .05, s(t * .6) * .3, s(t * 1.3) * .04); tail(s(t * 4) * .35);
  }
}

// ---------- characters on the road
const laneXs = (n) => Array.from({length: n}, (_, i) => (i - (n - 1) / 2) * 2);
let chars = [];
const STAR_GEO = new THREE.BoxGeometry(.14, .14, .14), STAR_MAT = new THREE.MeshBasicMaterial({color: '#ffe14a'});
function makeChar(crew, x) {
  const root = new THREE.Group(), body = new THREE.Group();
  const rig = makeRig(crew.id, true);
  body.add(rig.root); root.add(body);
  const stars = new THREE.Group();
  for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(STAR_GEO, STAR_MAT); stars.add(s); }
  stars.visible = false; root.add(stars);
  const bubble = new THREE.Mesh(BUBBLE_GEO, BUBBLE_MAT); bubble.position.y = .55; bubble.visible = false; root.add(bubble);
  // (v15) a soft dark spot on the ground under every racer (it shrinks as they jump), and the ice cube a snowball puts them in
  const blob = new THREE.Mesh(BLOB_GEO, BLOB_MAT); blob.renderOrder = 1; root.add(blob);
  const ice = new THREE.Mesh(ICE_GEO, ICE_MAT); ice.position.y = .58; ice.visible = false; root.add(ice);
  root.position.set(x, 0, -START);
  world.add(root);
  return {crew, rig, root, body, stars, bubble, blob, ice, x, row: START, safe: START, state: 'idle', t: 0, face: 0, queued: false, bonks: 0, lift: crew.float ? .22 : 0, seed: Math.random() * 10};
}
const HOP_T = .15;
function hop(c) {
  if (c.state !== 'idle' || c.row >= FINISH) return false;
  // (v15) a quick crouch first (anticipation), and a chain of quick hops climbs a note each time
  const close = !c.quiet && isMine(c) && closeCall(c, c.row, true);
  c.state = 'hop'; c.t = 0; c.pre = PRE_T; c.from = c.row; c.to = c.row + 1; c.face = Math.PI;
  if (!c.quiet) { c.chain = T - (c.hopT ?? -9) < 1 ? Math.min((c.chain || 0) + 1, 10) : 0; c.hopT = T; sfx.hop(c.chain); buzz(8); FX.hops++; }
  if (!c.quiet && isMine(c)) camKick(.07);
  if (close) nearMiss(c, close);
  if (!c.quiet && c.to >= FINISH && G && !G.over) { slowMo(.4, .5); punch(.08); }   // the winning hop, in slow motion
  const pl = G && G.players.find((x) => x.ch === c); if (pl) pvPulse('p' + pl.i, 'run', .4);
  return true;
}
function bonk(c, kind) {
  if (c.state === 'bonk') return;
  // (v14) a SHIELD takes the hit: it pops, and for a moment nothing can knock you back
  if (c.shield && kind !== 'back') { c.shield = false; c.inv = T + 1.4; c.bubble.visible = false; if (!c.quiet) { sfx.shield(); hitFx(c, 'shield'); } puff(c.root.position, 10); ring(c.root.position, '#9fe6ff', 14, .55); const pl = G && G.players.find((p) => p.ch === c); if (pl && !pl.bot) tagBurst(pl, 'SHIELD!', '#7ad8ff'); return; }
  if (T < (c.inv || 0) && kind !== 'back') return;
  c.state = 'bonk'; c.kind = kind; c.t = 0;
  if (kind !== 'back') c.bonks++;
  c.p0 = c.root.position.clone(); c.queued = false; c.pre = 0;
  if (!c.quiet && kind !== 'back') hitFx(c, kind);   // (v15) freeze frame, flash, shake, buzz
  if (kind === 'car') c.p0.y = Math.min(c.p0.y, groundAt(c.row) + c.lift);
  c.toRow = c.safe;
  const q = c.quiet; // the computer rivals in solo make no noise
  if (kind === 'snow') { c.toRow = prevLine(c.row); c.safe = c.toRow; splash(c.root.position, '#ffffff', 22); if (!q) sfx.splat(); }
  else if (kind === 'water') { splash(c.root.position, '#8fd3ff', 18); if (!q) sfx.splash(); }
  else if (kind === 'train') { if (!q) sfx.bonk(true); puff(c.root.position, 14); }
  else if (kind === 'back') { if (!q) sfx.hop(); c.face = 0; }
  else { if (!q) sfx.bonk(false); puff(c.root.position, 8); }
  const pl = G && G.players.find((p) => p.ch === c);
  if (pl && kind !== 'back') { pl.bonks++; onBonk(pl, kind); }
}
const ICE_T = .4; // (v15) a snowball first freezes you in an ice cube for a moment, then it cracks and you fly back
const BONK_T = {car: 1.05, train: 1.05, water: .95, back: .6, snow: 1.1 + ICE_T};
function updateChar(c, dt) {
  if (c.state === 'icon') { c.blob.visible = false; return; }
  const base = c.lift + (c.crew.float ? Math.sin(T * 3 + c.seed) * .06 : 0);
  const pos = c.root.position;
  c.stars.visible = false;
  if (c.state === 'hop' && c.pre > 0) {   // (v15) the crouch before the jump: squash down, feet still on the ground
    c.pre -= dt; const q = Math.sin(clamp(1 - c.pre / PRE_T, 0, 1) * Math.PI * .5);
    c.body.scale.set(1 + .22 * q, 1 - .24 * q, 1 + .22 * q); poseRig(c.rig, 'air', T);
  } else if (c.state === 'hop') {
    c.t += dt / (c.fly ? .95 : HOP_T);
    const k = Math.min(1, c.t), e = c.fly ? k * k * (3 - 2 * k) : k * (2 - k);
    pos.z = -lerp(c.from, c.to, e);
    pos.y = lerp(groundAt(c.from), groundAt(c.to), k) + Math.sin(Math.PI * k) * (c.fly ? 2.8 : .48) + base;
    if (c.fly) rocketTrail(pos);
    // (v15) stretch on the way up, back to round before landing
    const st = Math.sin(Math.PI * Math.min(1, k * 1.25));
    c.body.scale.set(1 - .13 * st, 1 + .22 * st, 1 - .13 * st);
    poseRig(c.rig, 'air', T);
    if (k >= 1) {
      c.state = 'idle'; c.landT = T;
      const flew = c.fly;
      if (c.fly) { for (let r = c.from + 1; r < c.to; r++) collect(c, r); c.fly = false; c.inv = T + .4; }
      c.row = c.to; landFx(c, flew);
      if (rows[c.row].type === 'grass' || rows[c.row].type === 'finish') c.safe = c.row;
      collect(c, c.row);
      onLand(c);
      if (c.queued && c.state === 'idle') { c.queued = false; onQueuedHop(c); }
    }
  } else if (c.state === 'bonk') {
    c.t += dt; const d = BONK_T[c.kind], k = clamp(c.t / d, 0, 1);
    poseRig(c.rig, c.kind === 'back' ? 'run' : c.kind === 'snow' && c.t < ICE_T ? 'air' : 'flail', T);
    const tz = -c.toRow, ty = groundAt(c.toRow) + base;
    if (c.kind === 'back') { // one long hop back to the safe line
      pos.z = lerp(c.p0.z, tz, k); pos.y = lerp(c.p0.y, ty, k) + Math.sin(Math.PI * k) * .9;
    } else if (c.kind === 'car') { // flattened like a pancake for a moment, dizzy stars, then a big hop back to the grass
      if (c.t < .5) {
        const sq = Math.min(1, c.t / .06); c.body.scale.set(1 + .45 * sq, 1 - .84 * sq, 1 + .45 * sq); pos.y = c.p0.y;   // (v15) squashed flat in 60 ms, not at once
        c.stars.visible = true; c.stars.children.forEach((s, i) => { const a = T * 6 + i * Math.PI / 2; s.position.set(Math.cos(a) * .45, .35, Math.sin(a) * .45); });
      } else {
        const q = clamp((c.t - .5) / (d - .5), 0, 1);
        c.body.scale.set(1, 1, 1); pos.z = lerp(c.p0.z, tz, q); pos.y = lerp(c.p0.y, ty, q) + Math.sin(Math.PI * q) * 1.3; c.body.rotation.x = -q * Math.PI * 2;
      }
    } else if (c.kind === 'train' || c.kind === 'snow') { // flung up in the air, spinning, and lands back on the grass
      const fz = c.kind === 'snow' ? ICE_T : 0;
      if (c.t < fz) { c.ice.visible = true; pos.x = c.x + Math.sin(c.t * 70) * .035; c.ice.scale.setScalar(Math.min(1, c.t / .08)); }   // frozen in an ice cube
      else {
        if (c.ice.visible) { c.ice.visible = false; ring(pos, '#d8f4ff', 16, .7); if (!c.quiet) sfx.clink(); }
        const q = clamp((c.t - fz) / (d - fz), 0, 1);
        pos.z = lerp(c.p0.z, tz, q); pos.y = lerp(c.p0.y, ty, q) + Math.sin(Math.PI * q) * 3.4;
        pos.x = c.x + Math.sin(Math.PI * q) * .6 * (c.x > 0 ? 1 : -1); c.body.rotation.z = q * Math.PI * 4; c.body.rotation.x = -q * Math.PI * 2;
      }
    } else { // into the water, then pops up on the bank
      if (c.t < .4) { pos.y = c.p0.y - c.t * 2; c.body.scale.setScalar(1 - c.t * .75); }
      else { const q = clamp((c.t - .4) / (d - .4), 0, 1); pos.z = tz; pos.y = ty; const s = q < .7 ? q / .7 * 1.15 : 1.15 - (q - .7) / .3 * .15; c.body.scale.setScalar(Math.max(.01, s)); }
    }
    if (k >= 1) {
      c.state = 'idle'; c.row = c.toRow; pos.set(c.x, ty, tz); c.body.scale.set(1, 1, 1); c.body.rotation.set(0, c.body.rotation.y, 0); c.ice.visible = false; c.landT = T; dust(pos, 8);
      if (c.kind === 'water') splash(pos, '#cfefff', 6);
      onBonkDone(c);
    }
  } else if (c.state === 'party') { // the end of the race: everyone celebrates on the podium, the winner the most
    const t = T + c.seed, w = c.rank === 0;
    const gy = groundAt(FINISH), py = gy + (c.partyPos.y - gy) * (party ? party.g : 1);   // (v15) riding up on the podium as it pops up
    pos.set(c.partyPos.x, py + base + (w ? Math.abs(Math.sin(t * 5.5)) * .55 : Math.abs(Math.sin(t * 7)) * .16), c.partyPos.z);
    c.face = w ? Math.sin(t * 1.6) * 1.1 : Math.sin(t * .8) * .3;
    c.body.scale.set(1, 1, 1);
    poseRig(c.rig, w || Math.floor(t / 2.2) % 2 ? 'cheer' : 'clap', t);
  } else {
    const pd = rows[c.row]?.type === 'river' ? padAt(rows[c.row], c.x) : null;
    pos.set(c.x, groundAt(c.row) + base - (pd ? padDip(pd) : 0), -c.row);
    // (v15) a springy landing: a strong squash that bounces back through a little stretch
    const since = T - (c.landT || -9), sq = since < .34 ? Math.sin(since * 21) * Math.exp(-since * 10) * .48 : 0;
    const breathe = Math.sin(T * 3.2 + c.seed) * .015;
    c.body.scale.set(1 + sq * .6, 1 - sq + breathe, 1 + sq * .6);
    const md = c.mood && T < c.mood.until ? c.mood : null;   // (v15) a little cheer for a right answer, a head shake for a wrong one
    if (md && md.kind === 'cheer') { poseRig(c.rig, 'cheer', T); pos.y += Math.abs(Math.sin((T - md.t0) * 9)) * .12; }
    else if (md) poseRig(c.rig, md.kind, T - md.t0);
    else poseRig(c.rig, 'idle', T + c.seed);
    // standing still: turn round to the class after a moment
    if (since > .7 && !(G && G.phase === 'hop' && G.players[G.active]?.ch === c)) c.face = 0;
    // whatever is on this square (cars, a train, a sinking pad) knocks the character back
    const hit = T < (c.inv || 0) ? null : danger(c.row, c.x); if (hit) bonk(c, hit);
  }
  if (c.state === 'hop' && c.t > .5 && !c.fly && T >= (c.inv || 0)) { const hit = danger(c.to, c.x); if (hit && hit !== 'water') { c.row = c.to; bonk(c, hit); } }
  if (c.bubble.visible !== !!c.shield) c.bubble.visible = !!c.shield;
  if (c.shield) { c.bubble.rotation.y += dt * 2; c.bubble.scale.setScalar(1 + Math.sin(T * 5 + c.seed) * .045); }
  // (v15) the ground spot: on the ground under the racer, smaller the higher they are
  const gy = c.state === 'party' ? groundAt(FINISH) + (c.partyPos.y - groundAt(FINISH)) * (party ? party.g : 1)
    : c.state === 'hop' ? lerp(groundAt(c.from), groundAt(c.to), clamp(c.t, 0, 1)) : groundAt(Math.round(-pos.z));
  c.blob.position.y = gy - pos.y + .025; c.blob.scale.setScalar(clamp(1 - (pos.y - gy) * .4, .35, 1));
  c.blob.visible = !(c.state === 'bonk' && c.kind === 'water');
  // turn smoothly towards where it faces
  const ry = c.body.rotation.y, goal = c.face;
  c.body.rotation.y = ry + (goal - ry) * Math.min(1, dt * 12);
}

// ---------- particles: little cubes for splashes, dust and confetti
// (v15) all the little cubes are ONE instanced mesh (one draw call however many are flying), so splashes, dust and confetti stay cheap
const PMAX = 320, PART_GEO = new THREE.BoxGeometry(.12, .12, .12);
const PARTS = new THREE.InstancedMesh(PART_GEO, new THREE.MeshBasicMaterial({color: '#ffffff'}), PMAX);
PARTS.frustumCulled = false; PARTS.count = 0; scene.add(PARTS);
PARTS.setColorAt(0, new THREE.Color('#ffffff'));
const parts = Array.from({length: PMAX}, () => ({life: 0, max: 1, size: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion()}));
let partTop = 0;
const _pm = new THREE.Matrix4(), _pe = new THREE.Euler(), _ps = new THREE.Vector3(), _pcol = new THREE.Color();
function spawnPart(p, color, v, life = .9, size = 1) {
  let i = parts.findIndex((x) => x.life <= 0); if (i < 0) return;
  const q = parts[i]; q.p.copy(p); q.v.copy(v); q.life = life; q.max = life; q.size = size; q.q.setFromEuler(_pe.set(Math.random() * 3, Math.random() * 3, 0));   // a random tilt, set once
  PARTS.setColorAt(i, _pcol.set(color)); PARTS.instanceColor.needsUpdate = true;
  partTop = Math.max(partTop, i + 1);
}
function splash(p, color, n) { for (let i = 0; i < n; i++) spawnPart(new THREE.Vector3(p.x + rand(-.2, .2), Math.max(p.y, -.3), p.z + rand(-.2, .2)), i % 3 ? color : '#ffffff', new THREE.Vector3(rand(-1.5, 1.5), rand(2.5, 4.5), rand(-1.5, 1.5)), rand(.6, .9)); }
function puff(p, n) { for (let i = 0; i < n; i++) spawnPart(new THREE.Vector3(p.x, p.y + .5, p.z), pick1(['#ffffff', '#dfe3ea', '#ffe14a']), new THREE.Vector3(rand(-2.5, 2.5), rand(1, 3.5), rand(-2.5, 2.5)), rand(.4, .7), 1.3); }
function confetti(p, n) { for (let i = 0; i < n; i++) spawnPart(new THREE.Vector3(p.x + rand(-1, 1), p.y + rand(0, 1), p.z), pick1(['#ff5fb8', '#ffd23f', '#3ddc84', '#5ec8ff', '#b07cff', '#ff8a2a']), new THREE.Vector3(rand(-3, 3), rand(4, 8), rand(-2, 2)), rand(1.4, 2.4)); }
function updateParts(dt) {
  let top = 0;
  for (let i = 0; i < partTop; i++) {
    const q = parts[i];
    if (q.life > 0) {
      q.life -= dt; q.v.y -= 9 * dt; q.p.addScaledVector(q.v, dt);
      const sc = q.life > 0 ? q.size * Math.min(1, q.life / q.max * 3) : 0;
      _pm.compose(q.p, q.q, _ps.setScalar(sc)); PARTS.setMatrixAt(i, _pm);
      if (q.life > 0) top = i + 1;
    }
  }
  partTop = top; PARTS.count = top; PARTS.instanceMatrix.needsUpdate = true;
}

// ---------- portraits: each character drawn once, small, for the cards (shown blown up without smoothing = pixel art)
const PORTRAIT = {};
(function portraits() {
  const S = 144, r = new THREE.WebGLRenderer({antialias: false, alpha: true, preserveDrawingBuffer: true});
  r.setSize(S, S, false); r.setPixelRatio(1);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8090b0, 1.9));
  const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(2, 3, 4); sc.add(l);
  const c = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50);
  for (const crew of CREW) {
    const g = cached('ch' + crew.id, () => boxesGeo(MODELS[crew.id], VOX)); g.computeBoundingBox();
    const m = new THREE.Mesh(g, MAT); m.rotation.y = -.35; sc.add(m);
    const bb = g.boundingBox, h = bb.max.y - bb.min.y, top = bb.max.y, half = Math.max(.58, h * .52);
    c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.updateProjectionMatrix();
    const cy = top - half * .92;
    c.position.set(1.2, cy + 1.2, 4); c.lookAt(0, cy, 0);
    r.render(sc, c);
    PORTRAIT[crew.id] = r.domElement.toDataURL('image/png');
    sc.remove(m);
  }
  r.dispose(); r.forceContextLoss?.();
})();


// ---------- live portraits: the cards, the lobby and the results show each character as a small moving 3D model,
// drawn by one little renderer and copied into each card's canvas every frame (blown up without smoothing = pixel art).
// Every portrait has a lasting mood ('idle', 'turn', 'cheer', 'clap') and short reactions ('right', 'sad', 'dizzy', 'run').
const PV = (() => {
  const S = 256, r = new THREE.WebGLRenderer({antialias: false, alpha: true}); // each portrait is drawn into a corner of this 256×256 buffer
  r.setSize(S, S, false); r.setPixelRatio(1);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8090b0, 1.9));
  const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(2, 3, 4); sc.add(l);
  return {S, r, sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50), list: [], frame: {}};
})();
function pvFrame(id) { // the camera for this character: the whole body filling the height, a little room above for jumping
  if (!PV.frame[id]) {
    const g = cached('ch' + id, () => boxesGeo(MODELS[id], VOX)); g.computeBoundingBox();
    const h = g.boundingBox.max.y - g.boundingBox.min.y, half = h * .56 + .04;
    PV.frame[id] = {half, cy: h * .5 + .06};
  }
  return PV.frame[id];
}
// a portrait's canvas takes the shape of its box (tall in a narrow card, square in the lobby), ~100 pixels high
function sizePV(p) {
  const w = p.cv.clientWidth, h = p.cv.clientHeight; if (!w || !h) return;
  const a = w / h;
  p.ph = a > 1.28 ? Math.round(256 / a) : 200; p.pw = Math.min(256, Math.round(p.ph * a));
  if (p.cv.width !== p.pw || p.cv.height !== p.ph) { p.cv.width = p.pw; p.cv.height = p.ph; }
}
const pvObserver = typeof ResizeObserver === 'function' ? new ResizeObserver((es) => es.forEach((e) => { const p = PV.list.find((x) => x.cv === e.target); if (p) sizePV(p); })) : null;
function mountPV(root) {
  root.querySelectorAll('canvas.pv:not([data-on])').forEach((cv) => {
    cv.dataset.on = 1; cv.width = cv.height = 200;
    const p = {cv, ctx: cv.getContext('2d'), id: cv.dataset.char, key: cv.dataset.key, rig: makeRig(cv.dataset.char), base: cv.dataset.mood || 'idle', burst: null, seed: Math.random() * 9, pw: 200, ph: 200};
    PV.list.push(p); sizePV(p); if (pvObserver) pvObserver.observe(cv);
  });
}
const nowS = () => performance.now() / 1000;
function pvBase(key, mood) { PV.list.forEach((p) => { if (p.key === key) p.base = mood; }); }
function pvPulse(key, mood, dur) { const t = nowS(); PV.list.forEach((p) => { if (p.key === key) p.burst = {mood, t0: t, end: t + dur}; }); }
function renderPV() {
  PV.list = PV.list.filter((p) => { if (p.cv.isConnected) return true; if (pvObserver) pvObserver.unobserve(p.cv); return false; });
  const now = nowS();
  for (const p of PV.list) {
    if (!p.cv.offsetParent) continue; // hidden
    if (p.burst && now > p.burst.end) p.burst = null;
    const mood = p.burst ? p.burst.mood : p.base, bt = p.burst ? now - p.burst.t0 : 0, t = now + p.seed, R0 = p.rig.root;
    let y = 0, ry = -.35, rz = 0, pose = 'idle', pt = t;
    if (mood === 'turn') { y = Math.abs(Math.sin(t * 6)) * .08; ry = -.2; }
    else if (mood === 'right') { const k = Math.min(1, bt / 1.1); y = Math.sin(Math.PI * k) * .3; ry = -.35 + k * Math.PI * 2; pose = 'cheer'; } // a happy jump with a spin
    else if (mood === 'sad') { pose = 'sad'; pt = bt; ry = -.25; }
    else if (mood === 'run') { y = Math.abs(Math.sin(t * 20)) * .04; pose = 'run'; ry = -.6; }
    else if (mood === 'dizzy') { rz = Math.sin(t * 8) * .14; pose = 'dizzy'; }
    else if (mood === 'cheer') { y = Math.abs(Math.sin(t * 6.5)) * .22; ry = -.35 + Math.sin(t * 2) * .6; pose = 'cheer'; }
    else if (mood === 'clap') { y = Math.abs(Math.sin(t * 9)) * .04; pose = 'clap'; ry = -.25; }
    else ry = -.35 + Math.sin(t * .5) * .18;
    poseRig(p.rig, pose, pt);
    R0.position.set(0, y + (p.id === 'ghost' ? .12 + Math.sin(t * 3) * .04 : 0), 0); R0.rotation.set(0, ry, rz);
    const f = pvFrame(p.id), c = PV.cam, a = p.pw / p.ph;
    // a tall box: the body fills the height; a wide one: the same height, more room at the sides
    const hw = Math.max(f.half * a, .42), hh = hw / a; // never narrower than the body (with its arms)
    c.left = -hw; c.right = hw; c.top = Math.max(f.half, hh); c.bottom = -Math.max(f.half, hh); c.updateProjectionMatrix();
    c.position.set(1.2, f.cy + 1.2, 4); c.lookAt(0, f.cy, 0);
    PV.r.setViewport(0, 0, p.pw, p.ph);
    PV.sc.add(R0); PV.r.render(PV.sc, c); PV.sc.remove(R0);
    p.ctx.clearRect(0, 0, p.pw, p.ph); p.ctx.drawImage(PV.r.domElement, 0, PV.S - p.ph, p.pw, p.ph, 0, 0, p.pw, p.ph);
  }
}

// ---------- sound: little 8-bit noises (Web Audio)
let actx = null, master = null, noiseBuf = null, muted = store.get('muted', false);
function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
    master = actx.createGain(); master.gain.value = muted ? 0 : .8; master.connect(actx.destination);
  }
  if (actx.state !== 'running') actx.resume().catch(() => {});
  return actx;
}
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => { try { if (!muted) audio(); } catch {} }, true));
function tone(f, dur, type = 'square', vol = .07, delay = 0, f2 = 0) {
  if (muted) return;
  try {
    const a = audio(), t = a.currentTime + .02 + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  } catch {}
}
function noise(dur, vol = .2, f0 = 1200, f1 = f0, delay = 0, type = 'bandpass') {
  if (muted) return;
  try {
    const a = audio(), t = a.currentTime + .02 + delay;
    if (!noiseBuf) { const n = a.sampleRate; noiseBuf = a.createBuffer(1, n, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + .02);
  } catch {}
}
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const sfx = {
  hop(n = 0) { const k = Math.pow(2, n / 12) * rand(.98, 1.02); tone(520 * k, .07, 'square', .05, 0, 860 * k); },   // (v15) a hop chain climbs a semitone per hop
  right(streak = 1) { const b = 72 + Math.min(streak - 1, 5) * 2; [0, 4, 7, 12].forEach((s, i) => tone(N(b + s), .09, 'square', .06, i * .065)); },
  wrong() { tone(N(67), .13, 'triangle', .09); tone(N(62), .26, 'triangle', .08, .12, N(60)); },   // (v15) a soft "uh-oh", no buzzer
  tick() { tone(1400, .03, 'square', .035); },
  count(go) { tone(go ? N(84) : N(72), go ? .45 : .16, 'square', .07); },
  bonk(big) { tone(big ? 500 : 380, big ? .5 : .35, 'triangle', .14, 0, 70); noise(.25, .25, 900, 200); if (big) tone(N(60), .3, 'sawtooth', .04, .05, N(48)); },
  splash() { noise(.45, .3, 2200, 300); tone(300, .2, 'sine', .08, 0, 80); },
  ding() { tone(N(93), .12, 'triangle', .05); },
  train() { [N(64), N(68)].forEach((f) => tone(f, .7, 'sawtooth', .025)); noise(1.6, .12, 300, 120, 0, 'lowpass'); },
  honk() { tone(N(67), .14, 'square', .03); tone(N(67), .14, 'square', .03, .18); },
  hops() { [0, 7, 12].forEach((s, i) => tone(N(79 + s), .07, 'square', .05, i * .05)); },
  coin(n = 0) { n = Math.min(n, 12); tone(N(88 + n), .06, 'square', .045); tone(N(95 + n), .1, 'square', .045, .06); },   // (v15) coins in a row climb the scale
  roll() { tone(N(79 + randi(0, 7)), .04, 'square', .03); },
  item() { [0, 4, 7, 12].forEach((s, i) => tone(N(84 + s), .08, 'triangle', .06, i * .05)); },
  rocket() { noise(.9, .18, 600, 2400); tone(N(60), .6, 'sawtooth', .04, 0, 900); },
  shield() { tone(N(84), .2, 'sine', .07, 0, 1800); },
  throw() { noise(.25, .15, 2400, 900); },
  // (v15) the new game-feel sounds
  land() { noise(.07, .07, 500, 150, 0, 'lowpass'); },
  thud() { noise(.3, .22, 400, 60, 0, 'lowpass'); tone(110, .25, 'sine', .12, 0, 45); },
  whoosh() { noise(.32, .2, 500, 3200); tone(N(91), .08, 'square', .035, .1); tone(N(96), .12, 'square', .035, .17); },
  fast(big) { (big ? [0, 4, 7, 11, 14] : [0, 4, 7]).forEach((s, i) => tone(N(86 + s), .06, 'triangle', .07, .28 + i * .045)); },
  streak(n) { const b = 79 + Math.min(n - 2, 6) * 2; [0, 7, 12, 16].forEach((s, i) => tone(N(b + s), .1, 'triangle', .06, .2 + i * .06)); if (n >= 3) noise(.4, .06, 3000, 6000, .2, 'highpass'); },
  box() { tone(N(72), .08, 'square', .06, 0, N(84)); noise(.18, .14, 1800, 600); },
  pip(i) { tone(N(76 + i * 2), .06, 'square', .045, i * .08); },
  splat() { noise(.3, .3, 2600, 500); tone(700, .15, 'triangle', .07, 0, 200); },
  clink() { tone(N(100), .08, 'triangle', .07); tone(N(105), .14, 'triangle', .06, .05); noise(.2, .12, 5000, 3000, 0, 'highpass'); },
  plus() { [0, 5, 9, 12].forEach((s, i) => tone(N(81 + s), .07, 'sine', .08, i * .05)); },
  safe() { [0, 4, 7, 12, 16].forEach((s, i) => tone(N(76 + s), .07, 'square', .05, i * .04)); },
  win() { [72, 76, 79, 84, 79, 84, 88, 91].forEach((n, i) => tone(N(n), i === 7 ? .5 : .12, 'square', .06, i * .12)); [48, 55, 60].forEach((n, i) => tone(N(n), .3, 'triangle', .1, i * .36)); },
};
const SPK_ON = '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M1 4h2l3-3h1v10H6L3 8H1z"/><path d="M8 4h1v4H8zM10 2h1v8h-1z"/></svg>';
const SPK_OFF = '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M1 4h2l3-3h1v10H6L3 8H1z"/><path d="M8 4h1v1h1V4h1v1h-1v2h1v1h-1V7H9v1H8V7h1V5H8z"/></svg>';
function renderMute() { $('muteBtn').innerHTML = muted ? SPK_OFF : SPK_ON; }
$('muteBtn').onclick = () => { muted = !muted; store.set('muted', muted); if (master) master.gain.value = muted ? 0 : .8; renderMute(); };
renderMute();

// ---------- questions: gap-fill sentences "text [right|wrong|wrong] (hint) text", as in Gummy and Defeat the Monster
const PACKS = window.FugioPacks ? FugioPacks.sort(window.GUMMY_PACKAGES || []) : (window.GUMMY_PACKAGES || []);
let packIds = store.get('packs', []).filter((id) => PACKS.some((p) => p.id === id));
if (!packIds.length && PACKS.length) packIds = [PACKS[0].id];
const packNow = () => window.FugioPacks ? FugioPacks.merge(PACKS, packIds) : PACKS.find((p) => p.id === packIds[0]);
const SLOT = new Set(['do', 'does', "don't", "doesn't", 'did', "didn't", 'was', 'were', "wasn't", "weren't", 'is', 'are', 'am',
  "isn't", "aren't", 'a', 'an', 'the', 'more', 'most', 'less', 'least', 'because', 'so', 'and', 'but', 'or', 'have', 'has', 'not']);
const slotKey = (t) => t.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/).filter(Boolean).map((w) => SLOT.has(w) ? w : '_').join(' ');
function mixComparisons(s) {
  const m = s.match(/^(.*)\[([^|\]]+)\|(the [^|\]]+)\]( \([^)]*\)) than [^.?!]*([.?!])$/);
  return m && Math.random() < .5 ? `${m[1]}[${m[3]}|${m[2]}]${m[4]} of all${m[5]}` : s;
}
function fillChoices(s) {
  const m = s.match(/\[([^\]]+)\]/);
  const [right, ...wrong] = m[1].split('|');
  const words = [{text: right, ok: true}, ...shuffle(wrong).slice(0, 2).map((t) => ({text: t, ok: false}))];
  words.sort((x, y) => slotKey(x.text).localeCompare(slotKey(y.text)) || x.text.localeCompare(y.text));
  words.before = s.slice(0, m.index); words.after = s.slice(m.index + m[0].length); words.right = right;
  return words;
}
// the further along a player is, the harder the questions (the package's easy third first, then the middle, then the hardest)
function pickSentence(p) {
  const pk = G.pack, prog = clamp((p.ch.row - START) / LEN, 0, .999), r = Math.floor(prog * 3);
  const mine = pk.rounds[r] || [], rest = pk.rounds.filter((_, i) => i !== r).flat();
  const free = (l) => l.filter((s) => !G.used.has(s));
  let pool = free(mine); if (!pool.length) pool = free(rest);
  if (!pool.length) { G.used.clear(); pool = mine.length ? mine : rest; }
  const s = pick1(pool); G.used.add(s);
  return mixComparisons(s);
}

// ---------- lobby
const SETUP_KEY = SOLO ? 'setupSolo' : 'setup';
const setup = Object.assign({n: 4, chars: ['foxino', 'stella', 'pix', 'rob'], names: ['', '', '', ''], len: 'medium', time: 10},
  SOLO ? {n: 1, len: 'short', time: 12, rivals: 'normal'} : {}, store.get(SETUP_KEY, {}));
if (SOLO) setup.n = 1;
const saveSetup = () => store.set(SETUP_KEY, setup);
// the computer rivals: how long they "think" about a question (s), how often they get it right, how often they hop without looking
// (v12) plus a short breather after each crossing, as you have between your turns (reading the next question)
const RIVALS = {easy: {think: [5.8, 9], acc: .65, careless: .12, rest: [.8, 1.5]}, normal: {think: [4, 6.2], acc: .78, careless: .06, rest: [.6, 1.2]}, hard: {think: [2.6, 4.2], acc: .88, rest: [.4, .8], careless: .025}};
let lobbyChars = [];
// (v13) solo: your racer and name sit in the top-right corner (#profile); the class lobby keeps its row of slots
const SLOTS = SOLO ? $('profile') : $('slots');
// LEAVE: back to the Fugio library (the player closes), or to fugio.co when the game is open on its own
$('leaveBtn').onclick = () => { sfx.hop(); if (window.parent !== window) window.parent.postMessage({fugio: 'leave'}, '*'); else location.href = 'https://www.fugio.co/'; };
function renderLobby() {
  $('nSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.n === setup.n));
  $('lenSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.len === setup.len));
  $('tVal').textContent = setup.time + 's';
  $('rivSeg')?.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.r === setup.rivals));
  const sl = SLOTS; sl.style.setProperty('--n', setup.n);
  sl.innerHTML = Array.from({length: setup.n}, (_, i) => {
    const c = crewOf(setup.chars[i]);
    return `<div class="slot px" style="--ring:${c.ring}"><button class="pbtn dark arr" data-i="${i}" data-d="-1" aria-label="Previous character">&#9664;</button>
      <div class="who"><span class="tagp">${SOLO ? 'YOU' : `P${i + 1}`} · ${esc(c.name.toUpperCase())}</span><div class="pic" data-i="${i}"><canvas class="pv" data-char="${c.id}" data-key="l${i}" aria-label="${esc(c.name)}"></canvas></div>
      <input data-i="${i}" maxlength="14" placeholder="${SOLO ? 'Your name' : esc(c.name)}" value="${esc(setup.names[i] || '')}" aria-label="Player ${i + 1} name"></div>
      <button class="pbtn dark arr" data-i="${i}" data-d="1" aria-label="Next character">&#9654;</button></div>`;
  }).join('');
  // (v14) solo: your level, your coins and the SHOP under your racer
  if (SOLO) sl.insertAdjacentHTML('beforeend', `<div class="pf-bar"><span class="pf-lv">LV ${myLevel()}</span><span class="pf-lvbar"><i style="width:${((myLevel() - 1) / (MAX_LEVEL - 1) * 100).toFixed(1)}%"></i></span><span class="pf-coins"><i class="gc"></i>${purse()}</span><button class="pbtn yellow pf-shop">SHOP</button></div>`);
  const sum = window.FugioPacks ? FugioPacks.summary(PACKS, packIds) : {title: 'Questions', sub: '', level: '–'};
  const LVC = {A0: '#5ee08a', A1: '#4fb4ff', A2: '#b57bff'};
  $('qcard').innerHTML = `<span class="lv" style="--c:${LVC[sum.level] || '#ffb357'}">${esc(sum.level)}</span>
    <span class="t"><span class="lab">QUESTIONS</span><b>${esc(sum.title)}</b><small>${esc(sum.sub)}</small></span><span class="go">CHANGE &#9654;</span>`;
  mountPV(sl);
  placeLobbyChars();
}
function placeLobbyChars() {
  lobbyChars.forEach((c) => world.remove(c.root));
  const xs = laneXs(setup.n), a = innerWidth / innerHeight;
  // (v13) solo on a wide screen: the settings column is on the right, so your racer stands left of the middle
  if (SOLO && a >= 1) xs[0] = -(a < 1.2 ? 10.5 : a < 1.5 ? 13 : 15.5) * 1.25 * .2;
  lobbyChars = Array.from({length: setup.n}, (_, i) => makeChar(crewOf(setup.chars[i]), xs[i]));
}
function cycleChar(i, d) {
  const taken = new Set(setup.chars.slice(0, setup.n).filter((_, k) => k !== i));
  let k = CREW.findIndex((c) => c.id === setup.chars[i]);
  do { k = (k + d + CREW.length) % CREW.length; } while (taken.has(CREW[k].id));
  setup.chars[i] = CREW[k].id; saveSetup(); renderLobby(); sfx.hop();
  pvPulse('l' + i, 'right', 1.1);
}
$('slots').hidden = SOLO;
SLOTS.addEventListener('click', (e) => {
  if (e.target.closest('.pf-shop')) { sfx.hop(); return openShop(); }
  const a = e.target.closest('.arr'); if (a) return cycleChar(+a.dataset.i, +a.dataset.d);
  const p = e.target.closest('.pic'); if (p) cycleChar(+p.dataset.i, 1);
});
SLOTS.addEventListener('input', (e) => { const i = e.target.dataset.i; if (i != null) { setup.names[+i] = e.target.value.trim(); saveSetup(); } });
$('nSeg').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  setup.n = +b.dataset.n;
  // everyone keeps a different character
  const seen = new Set();
  for (let i = 0; i < 4; i++) { if (seen.has(setup.chars[i]) || !setup.chars[i]) setup.chars[i] = CREW.find((c) => !seen.has(c.id)).id; seen.add(setup.chars[i]); }
  saveSetup(); renderLobby();
};
if ($('rivSeg')) $('rivSeg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; setup.rivals = b.dataset.r; saveSetup(); renderLobby(); };
$('lenSeg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; setup.len = b.dataset.len; saveSetup(); renderLobby(); };
$('tMinus').onclick = () => { setup.time = Math.max(5, setup.time - 1); saveSetup(); renderLobby(); };
$('tPlus').onclick = () => { setup.time = Math.min(20, setup.time + 1); saveSetup(); renderLobby(); };
$('qcard').onclick = async () => {
  if (!window.FugioPacks) return;
  const ids = await FugioPacks.open(PACKS, packIds, {theme: 'pixel', kicker: 'PICK YOUR QUESTIONS'});
  if (ids && ids.length) { packIds = ids; store.set('packs', ids); renderLobby(); }
};
$('startBtn').onclick = () => startRace();

// ---------- the race
let G = null;
function startRace() {
  const pack = packNow(); if (!pack) return;
  buildWorld(LENS[setup.len] || LENS.medium);
  lobbyChars = [];
  const xs = SOLO ? [-1, -3, 1, 3] : laneXs(setup.n); // solo: you in an inner lane, the rivals around you
  // solo: three rivals, each a different character from yours
  const ids = SOLO ? [setup.chars[0]].concat(shuffle(CREW.filter((c) => c.id !== setup.chars[0])).slice(0, 3).map((c) => c.id)) : setup.chars.slice(0, setup.n);
  G = {pack, time: setup.time, used: new Set(), turn: 0, active: -1, phase: 'intro', over: false, paused: false,
    players: ids.map((cid, i) => {
      const crew = crewOf(cid), bot = SOLO && i > 0;
      const p = {i, id: crew.id, name: bot ? crew.name : setup.names[i] || (SOLO ? 'You' : crew.name), you: SOLO && !i, bot, ring: crew.ring, ch: makeChar(crew, xs[i]), right: 0, asked: 0, streak: 0, best: 0, bonks: 0, last: '', log: []};
      if (bot) { p.ch.quiet = true; p.ai = {lv: RIVALS[setup.rivals] || RIVALS.normal, state: 'think', until: 0, target: 0, nextHop: 0}; }
      return p;
    })};
  chars = G.players.map((p) => p.ch);
  G.players.forEach((p) => { p.coins = 0; p.item = null; if (p.you && upLv('helmet')) p.ch.shield = true; });
  placePickups();
  T = 0;
  $('lobby').hidden = true; $('final').hidden = true; $('hud').hidden = false; $('cards').hidden = false; tagBox = null;
  lobbyView = false; stopParty();
  renderCards(); renderTrack(); buildTags();
  camGoal.set(0, 0, -START); camAt.copy(camGoal); camV.set(0, 0, 0); fxs.length = 0; trauma = 0;
  countdown();
}
async function countdown() {
  const me = G;
  for (const s of ['3', '2', '1', 'GO!']) {
    if (G !== me) return;
    $('big').innerHTML = `<b class="${s === 'GO!' ? 'go' : ''}">${s}</b>`; sfx.count(s === 'GO!'); punch(s === 'GO!' ? .07 : .025);
    await wait(s === 'GO!' ? 450 : 600);
  }
  $('big').innerHTML = '';
  if (G === me) nextTurn();
}

// the players' cards: fixed places along the bottom; the card whose turn it is grows and asks its question
function renderCards() {
  const box = $('cards');
  box.innerHTML = G.players.filter((p) => !p.bot).map((p, i) => `<div class="card px" id="card${i}" style="--ring:${p.ring}">
    <div class="c-head"><span class="c-num">P${i + 1}</span><b class="c-name">${esc(p.name)}</b><span class="c-chip"></span><span class="c-coins">0</span><button class="c-item" data-p="${i}" aria-label="Use your power-up"></button><span class="c-row"></span></div>
    <div class="c-mid"><div class="c-pic"><canvas class="pv" data-char="${p.id}" data-key="p${i}"></canvas><span class="c-streak"></span></div><div class="c-msg"><span class="wait">WAITING</span></div></div>
    <div class="c-ans">${[1, 2, 3].map(() => '<button class="pbtn" disabled>?</button>').join('')}</div>
    <div class="c-bar"><i></i><span></span></div></div>`).join('');
  mountPV(box);
  layoutCards(-1);
}
function layoutCards(active) {
  const n = G.players.length;
  $('cards').style.gridTemplateColumns = SOLO ? '1fr' : G.players.map((_, i) => i === active ? (n > 2 ? '2.3fr' : '1.6fr') : '1fr').join(' ');
  const next = active >= 0 ? (active + 1) % n : -1;
  G.players.forEach((p, i) => {
    const el = $('card' + i); if (!el) return;
    el.classList.toggle('active', i === active); el.classList.toggle('next', i === next && i !== active);
    pvBase('p' + i, i === active ? 'turn' : 'idle');
    el.querySelector('.c-chip').textContent = SOLO ? '' : i === active ? 'YOUR TURN' : i === next ? 'NEXT' : '';
    el.querySelector('.c-row').textContent = `${clamp(p.ch.row - START, 0, LEN)}/${LEN}`;
    el.querySelector('.c-streak').textContent = p.streak >= 2 ? `x${p.streak}` : '';
    if (i !== active) {
      el.querySelector('.c-msg').innerHTML = p.last || '<span class="wait">WAITING</span>';
      if (p.last) fitText(el.querySelector('.c-msg'), innerHeight * .03);
      el.querySelector('.c-ans').innerHTML = [1, 2, 3].map(() => '<button class="pbtn" disabled>?</button>').join('');
      const bar = el.querySelector('.c-bar i'); bar.style.width = '0'; bar.className = ''; el.querySelector('.c-bar span').textContent = '';
    }
  });
}
// shrink the sentence until it fits its box
function fitText(el, max) {
  let s = max; el.style.fontSize = s + 'px';
  while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && s > 13) { s *= .93; el.style.fontSize = s + 'px'; }
}
function fitAnswers(card) {
  card.querySelectorAll('.c-ans .pbtn:not(.hop)').forEach((b) => {
    let s = SOLO ? Math.max(20, innerHeight * .03) : innerHeight * .028; b.style.fontSize = s + 'px';
    while ((b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) && s > 12) { s *= .92; b.style.fontSize = s + 'px'; }
  });
}
function renderTrack() {
  const tr = $('track');
  tr.querySelectorAll('.head').forEach((h) => h.remove());
  G.players.forEach((p, i) => {
    const h = document.createElement('div'); h.className = 'head'; h.id = 'head' + i; h.style.setProperty('--ring', p.ring);
    h.style.top = G.players.length > 2 ? (i % 2 ? '68%' : '32%') : '50%'; // two rows of heads, so players on the same row don't hide each other
    h.innerHTML = `<img src="${PORTRAIT[p.id]}" alt="">`; tr.appendChild(h);
  });
  updateTrack();
}
function updateTrack() {
  if (!G) return;
  G.players.forEach((p, i) => {
    const h = $('head' + i); if (!h) return;
    const k = clamp((p.ch.row - START) / LEN, 0, 1);
    h.style.left = `calc(2.5vh + (100% - 8vh) * ${k.toFixed(4)})`; h.classList.toggle('on', i === G.active);
  });
}
// name tags floating over the characters
function buildTags() {
  $('tags').innerHTML = G.players.map((p, i) => `<div class="tag" id="tag${i}" style="--ring:${p.ring}">${SOLO ? '' : `P${i + 1} `}${esc(p.name.toUpperCase())}</div>`).join('');
}
const _v = new THREE.Vector3();
// (v15) the card row's top and the HUD's bottom are read once (again after a resize or a new race), not every frame
let tagBox = null; addEventListener('resize', () => { tagBox = null; });
function updateTags() {
  if (!G || $('cards').hidden) return;
  if (!tagBox) { const r = $('cards').getBoundingClientRect(); tagBox = {cardsTop: r.top, cl: r.left - 20, cr: r.right + 20, topY: $('hud').getBoundingClientRect().bottom + 34}; }
  const {cardsTop, cl, cr, topY} = tagBox;
  G.players.forEach((p, i) => {
    const el = $('tag' + i); if (!el) return;
    const top = p.ch.root.position, h = p.id === 'gummy' ? 1.45 : 1.25;
    _v.set(top.x, top.y + h, top.z).project(cam);
    const x = (_v.x + 1) / 2 * innerWidth; let y = (1 - _v.y) / 2 * innerHeight;
    // (v15) a racer far ahead, above the top of the screen: their tag waits at the top edge with an arrow and how far ahead they are
    const edge = y < topY && i !== G.active && p.ch.state !== 'party' && G.active >= 0;
    if (edge) { y = topY; const a = '+' + Math.max(1, p.ch.row - G.players[G.active].ch.row); if (el.dataset.ahead !== a) el.dataset.ahead = a; }
    if (el.classList.contains('edge') !== edge) el.classList.toggle('edge', edge);
    const off = (!edge && y < 50) || (y > cardsTop - 10 && x > cl && x < cr) || p.ch.state === 'bonk';   // (v15) only where the cards really are (a phone held sideways has them on the right)
    el.style.opacity = off ? 0 : 1;
    el.style.transform = `translate(${Math.round(clamp(x, 40, innerWidth - 40))}px,${Math.round(y)}px) translate(-50%,-100%)`;
    el.classList.toggle('on', i === G.active);
  });
}

function nextTurn() {
  if (!G || G.over) return;
  const n = G.players.length, pi = SOLO ? 0 : G.turn % n, p = G.players[pi];
  G.active = pi; G.phase = 'q';
  if (SOLO && !G.botsOn) { G.botsOn = true; G.players.forEach((b) => { if (b.bot) { b.ai.took = rand(...b.ai.lv.think); b.ai.until = T + b.ai.took; } }); }
  const words = fillChoices(pickSentence(p));
  G.cur = {pi, words};
  layoutCards(pi); updateTrack();
  const card = $('card' + pi);
  card.querySelector('.c-msg').innerHTML = `<div class="sent">${esc(words.before)}<span class="gap">?</span>${esc(words.after)}</div>`;
  card.querySelector('.c-ans').innerHTML = words.map((w, i) => `<button class="pbtn" data-i="${i}"><span class="k">${i + 1}</span>${esc(w.text)}</button>`).join('');
  // the card widens over .35 s: size the text once it has its new width
  setTimeout(() => { if (G?.cur?.words === words) { fitText(card.querySelector('.c-msg'), SOLO ? Math.max(24, innerHeight * .042) : innerHeight * .042); fitAnswers(card); } }, 280);
  fitText(card.querySelector('.c-msg'), SOLO ? Math.max(24, innerHeight * .042) : innerHeight * .042); fitAnswers(card);
  runTimer(G.time, (rem, dur) => {
    const bar = card.querySelector('.c-bar i'), tl = card.querySelector('.c-bar span');
    bar.style.width = (rem / dur * 100) + '%'; bar.className = rem < 3000 ? 'low' : '';
    tl.textContent = (rem / 1000).toFixed(1) + 's LEFT';
  }, () => answer(-1), true);
}
// a countdown that waits while the menu is open; tick(rem, dur) every frame, done() at zero
function runTimer(secs, tick, done, ticks) {
  cancelAnimationFrame(G.timer);
  const me = G, dur = secs * 1000; let t0 = performance.now(), prev = t0, lastSec = secs;
  G.t0 = t0; G.extra = 0;   // (v14) the +5 SECONDS power-up adds to G.extra
  const step = (now) => {
    if (G !== me || G.timerOff) return;
    if (G.paused) t0 += now - prev;
    prev = now; G.t0 = t0;
    const rem = Math.max(0, dur + (G.extra || 0) - (now - t0));
    tick(Math.min(rem, dur), dur);
    const s = Math.ceil(rem / 1000); if (ticks && s < lastSec && s <= 3 && s > 0) sfx.tick(); lastSec = s;
    if (rem <= 0) return done();
    G.timer = requestAnimationFrame(step);
  };
  G.timerOff = false;
  G.timer = requestAnimationFrame(step);
}
function stopTimer() { if (G) { G.timerOff = true; cancelAnimationFrame(G.timer); } }

$('cards').addEventListener('click', (e) => {
  if (!G || G.paused) return;
  const it = e.target.closest('.c-item'); if (it) return useItem(G.players[+it.dataset.p]);
  const b = e.target.closest('.card.active .c-ans .pbtn'); if (!b) return;
  if (b.classList.contains('hop')) return tapHop();
  if (G.phase === 'q' && b.dataset.i != null) answer(+b.dataset.i);
});
addEventListener('keydown', (e) => {
  // (v15) on the results: Enter or R races again straight away
  if (G && G.over && !$('final').hidden && $('ov').hidden && (e.key === 'Enter' || e.key === 'r' || e.key === 'R')) { e.preventDefault(); startRace(); return; }
  if (!G || G.paused || $('cards').hidden || e.target.tagName === 'INPUT') return;
  if (G.phase === 'q') { const i = +e.key - 1; if (i >= 0 && G.cur && i < G.cur.words.length) answer(i); }
  else if (G.phase === 'hop' && [' ', 'Enter', 'ArrowUp', 'w'].includes(e.key)) { e.preventDefault(); tapHop(); }
  if ((e.key === 'e' || e.key === 'E' || e.key === 'Shift') && G.active >= 0) useItem(G.players[G.active]);
});
// in the hop part of a turn the whole road is a HOP button too (easy to hit on a big board)
canvas.addEventListener('pointerdown', () => { if (G && G.phase === 'hop' && !G.paused) tapHop(); });

// A right answer gives exactly the hops to reach the nearest SAFE LINE ahead (grass), not one more: through the road,
// railway or river in between. When the nearest one is just one block ahead, the hops go on to the second nearest. Hit on the way: back to the safe line, and try again while the time lasts.
// Time up halfway across: the character runs back to the safe line it started from. So between turns everybody
// always stands on a safe line.
const isSafe = (r) => r >= FINISH || rows[r]?.type === 'grass' || rows[r]?.type === 'finish';
function nearestSafe(r) { let k = r + 1; while (k < FINISH && !isSafe(k)) k++; return Math.min(k, FINISH); }
function nextSafe(r) { const k = nearestSafe(r); return k === r + 1 && k < FINISH ? nearestSafe(k) : k; }
// (v12, class feedback: "the hopping is too easy, everyone gets across; maybe the time you have left on the question
// is your time to cross, with some minimum") the seconds left on the question clock become the HOP TIME, never less
// than a fair minimum for that many lanes, never more than the old generous time
const HOP_MIN = (n) => 1.5 + .8 * n, HOP_MAX = (n) => 4 + 1.4 * n;
const hopSecs = (n, left) => clamp(left, HOP_MIN(n), HOP_MAX(n));
async function answer(idx) {
  if (!G || G.phase !== 'q') return;
  const me = G; G.phase = 'answered';
  G.left = idx >= 0 ? Math.max(0, G.time + (G.extra || 0) / 1000 - (performance.now() - G.t0) / 1000) : 0;   // seconds left on the question clock
  stopTimer();
  const {pi, words} = G.cur, p = G.players[pi], card = $('card' + pi);
  const ok = idx >= 0 && words[idx].ok, ri = words.findIndex((w) => w.ok);
  p.asked++; if (ok) p.right++;
  p.streak = ok ? p.streak + 1 : 0; p.best = Math.max(p.best, p.streak);
  p.log.push({before: words.before, after: words.after, right: words.right, pick: idx >= 0 ? words[idx].text : null, ok});
  const btns = card.querySelectorAll('.c-ans .pbtn');
  btns.forEach((b, i) => { b.disabled = true; if (i !== idx && i !== ri) b.classList.add('dim'); });
  const gap = card.querySelector('.gap'); if (gap) { gap.textContent = words.right; gap.classList.add(ok ? 'ok' : 'no'); }
  p.last = ok ? `<div><span class="ok">&#10003; ${esc(words.right)}</span></div>`
    : `<div><span class="no">${idx < 0 ? 'TIME' : esc(words[idx].text)}</span><span class="ar">&rarr;</span><span class="ok">${esc(words.right)}</span></div>`;
  card.querySelector('.c-streak').textContent = p.streak >= 2 ? `x${p.streak}` : '';
  card.querySelector('.c-streak').classList.toggle('hot', p.streak >= 3);
  const at = btns[idx >= 0 ? idx : ri].getBoundingClientRect();
  if (ok) {
    btns[idx].classList.add('right'); sfx.right(p.streak); pvPulse('p' + pi, 'right', 1.1);
    const need = nextSafe(p.ch.row) - p.ch.row; G.hopTime = hopSecs(need, G.left) + (p.you ? .5 * upLv('spring') : 0); p.hopSum = (p.hopSum || 0) + G.left;
    burst(at.left + at.width / 2, at.top, `+${need} HOP${need > 1 ? 'S' : ''} · ${G.hopTime.toFixed(1)}s`, G.left >= HOP_MAX(need) * .8 ? '#ffd23f' : '#3ddc84');
    rightFx(p, btns[idx], at);   // (v15) sparks, a cheer, FAST! coins, the streak
    await wait(450); if (G !== me) return;
    startCross(1);
  } else {
    if (idx >= 0) btns[idx].classList.add('wrong');
    btns[ri].classList.add('reveal'); sfx.wrong(); pvPulse('p' + pi, 'sad', 1.6); wrongFx(p, card);
    burst(at.left + at.width / 2, at.top, idx < 0 ? 'TIME!' : 'OOPS!', '#ff4d6d');
    await wait(1400); if (G !== me) return;
    endTurn();
  }
}
function startCross(n) {
  const pi = G.active, p = G.players[pi], card = $('card' + pi), c = p.ch;
  G.phase = 'hop'; G.cross = n; G.from = c.row; G.target = nextSafe(c.row);
  showGoal(c, G.target);
  const secs = G.hopTime || hopSecs(G.target - c.row, 0), fast = secs >= HOP_MAX(G.target - c.row) * .8;
  card.querySelector('.c-msg').innerHTML = `<div><span class="ok">&#10003; ${esc(G.cur.words.right)}</span><span class="hops">${G.target - c.row} HOP${G.target - c.row > 1 ? 'S' : ''} TO THE SAFE LINE</span><span class="hops" style="color:${fast ? '#ffd23f' : '#c9cdf8'}">${fast ? 'FAST ANSWER: LOTS OF TIME!' : `${secs.toFixed(1)}s TO CROSS. GO!`}</span></div>`;
  fitText(card.querySelector('.c-msg'), innerHeight * .036);
  renderHopBtn(true);
  for (let k = 0; k < G.target - c.row; k++) sfx.pip(k);   // (v15) the hop pips fill one by one, each a note higher
  runTimer(secs, (rem, dur) => {
    const bar = card.querySelector('.c-bar i'), tl = card.querySelector('.c-bar span');
    bar.style.width = (rem / dur * 100) + '%'; bar.className = rem < 2500 ? 'low' : 'hopt'; tl.textContent = `HOP TIME ${(rem / 1000).toFixed(1)}s`;
  }, () => timeUp(), true);
}
function renderHopBtn(fresh) {
  const card = $('card' + G.active); if (!card || G.phase !== 'hop') return;
  const c = G.players[G.active].ch, total = G.target - G.from, done = clamp(c.row - G.from, 0, total);
  const pips = Array.from({length: total}, (_, k) => `<i class="${k < done ? 'used' : ''}${fresh ? ' in' : ''}"${fresh ? ` style="animation-delay:${k * 80}ms"` : ''}></i>`).join('');
  card.querySelector('.c-ans').innerHTML = `<button class="pbtn hop"${c.row < G.target ? '' : ' disabled'}>HOP! &#9650;<span class="pips">${pips}</span></button>`;
}
function tapHop() {
  if (!G || G.phase !== 'hop') return;
  const c = G.players[G.active].ch;
  if (c.state === 'idle') { if (c.row < G.target) hop(c); }
  else if (c.state === 'hop' && !c.queued && c.to < G.target) c.queued = true; // a quick double tap: the next hop follows straight after landing
}
function onQueuedHop(c) {
  if (G && G.phase === 'hop' && G.players[G.active].ch === c && c.row < G.target) hop(c);
}
function onLand(c) {
  if (!G) return;
  updateTrack();
  const p = G.players.find((x) => x.ch === c);
  const pc = p && $('card' + p.i); if (pc) { const el = pc.querySelector('.c-row'); el.textContent = `${clamp(c.row - START, 0, LEN)}/${LEN}`; bump(el); }
  if (c.row >= FINISH && !G.over) return winRace(p);
  if (!c.quiet && isMine(c)) { const cl = closeCall(c, c.row, false); if (cl) nearMiss(c, cl); }   // (v15) landing just behind a car
  if (G.phase !== 'hop' || p !== G.players[G.active]) return;
  renderHopBtn();
  if (c.row >= G.target) { // safe!
    c.queued = false; G.cross--;
    sfx.safe(); pvPulse('p' + p.i, 'right', 1.1); const r = $('tag' + p.i)?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.bottom + 30, 'SAFE!', '#3ddc84');
    ring(c.root.position, '#3ddc84', 10, .35); buzz(15);
    if (G.cross > 0 && G.target < FINISH) { stopTimer(); setTimeout(() => { if (G && G.phase === 'hop') startCross(G.cross); }, 250); }
    else { stopTimer(); G.phase = 'done'; hideGoal(); setTimeout(endTurn, 350); }
  }
}
function onBonk(p, kind) {
  if (kind === 'back' || p.bot) return;
  pvPulse('p' + p.i, 'dizzy', 1.2);
  const el = $('tag' + p.i), r = el?.getBoundingClientRect();
  if (r) burst(r.left + r.width / 2, r.bottom + 20, kind === 'water' ? 'SPLASH!' : kind === 'train' ? 'WHOOSH!' : kind === 'snow' ? 'SNOWBALL!' : 'BONK!', kind === 'snow' ? '#bfe9ff' : '#ffd23f');
}
function onBonkDone(c) {
  if (!G) return;
  updateTrack();
  const p = G.players.find((x) => x.ch === c);
  const pc = p && $('card' + p.i); if (pc) pc.querySelector('.c-row').textContent = `${clamp(c.row - START, 0, LEN)}/${LEN}`;
  if (p !== G.players[G.active]) return;
  if (G.phase === 'hop' && c.kind === 'snow') { G.from = c.row; G.target = nextSafe(c.row); showGoal(c, G.target); }
  if (G.phase === 'hop') renderHopBtn();
  if (G.phase === 'timeup') { G.phase = 'done'; setTimeout(endTurn, 200); }
}
// the hop time is over: whoever is still on the road runs back to the safe line they started from
function timeUp() {
  if (!G || G.phase !== 'hop') return;
  const c = G.players[G.active].ch;
  if (c.state !== 'idle') { setTimeout(timeUp, 80); return; } // let the jump or the knock-back finish first
  stopTimer(); hideGoal();
  if (isSafe(c.row)) { G.phase = 'done'; setTimeout(endTurn, 250); return; }
  G.phase = 'timeup';
  const r = $('tag' + G.active)?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.bottom + 20, 'BACK!', '#ffd23f');
  bonk(c, 'back');
}
function endTurn() {
  if (!G || G.over) return;
  hideGoal();
  G.turn++;
  G.phase = 'between';
  setTimeout(() => { if (G && !G.over) nextTurn(); }, 120);
}
// the safe line the active player has to reach: a glowing frame and a little flag on that square
const goal = new THREE.Group();
(() => {
  const m = new THREE.MeshBasicMaterial({color: '#ffe14a', fog: false});
  for (const [x, z, w, d] of [[0, -.42, .92, .08], [0, .42, .92, .08], [-.42, 0, .08, .92], [.42, 0, .08, .92]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .05, d), m); b.position.set(x, .03, z); goal.add(b); }
  const pole = new THREE.Mesh(new THREE.BoxGeometry(.05, .8, .05), new THREE.MeshLambertMaterial({color: '#ffffff'})); pole.position.set(.36, .4, -.36); goal.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(.3, .2, .03), new THREE.MeshLambertMaterial({color: '#3ddc84'})); flag.position.set(.52, .68, -.36); goal.add(flag);
  goal.visible = false; scene.add(goal);
})();
function showGoal(c, r) { goal.position.set(c.x, groundAt(r), -r); goal.visible = true; }
function hideGoal() { goal.visible = false; }
function pulseGoal() { if (goal.visible) { const k = 1 + Math.sin(T * 7) * .06; goal.scale.set(k, 1, k); } }
function burst(x, y, txt, color, cls) {
  const el = document.createElement('div'); el.className = 'burst' + (cls ? ' ' + cls : ''); el.textContent = txt; el.style.color = color;
  x = clamp(x, 80, innerWidth - 80);   // (v15) never off the screen: a long one wraps onto two lines instead
  el.style.maxWidth = Math.max(150, 2 * Math.min(x, innerWidth - x) - 12) + 'px';
  el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}

async function winRace(p) {
  const me = G;
  G.over = true; G.phase = 'over'; stopTimer(); G.winner = p;
  layoutCards(-1); G.active = -1; hideGoal(); pvBase('p' + p.i, 'cheer');
  p.ch.state = 'party'; p.ch.rank = 0; p.ch.partyPos = p.ch.root.position.clone(); p.ch.partyPos.y = groundAt(FINISH);
  sfx.win(); winFx(p);
  $('big').innerHTML = `<b class="small">${p.you ? 'YOU WIN!' : esc(p.name.toUpperCase()) + ' WINS!'}</b>`;
  for (let k = 0; k < 4; k++) { if (G !== me) return; confetti(p.ch.root.position, 40); await wait(380); }
  await wait(400); if (G !== me) return;
  $('big').innerHTML = '';
  showFinal();
}
function showFinal() {
  const ps = G.players.slice().sort((a, b) => (b === G.winner) - (a === G.winner) || b.ch.row - a.ch.row || b.right - a.right || a.bonks - b.bonks);
  const w = ps[0];
  $('winBox').style.setProperty('--ring', w.ring);
  const me = G.players.find((p) => p.you);
  $('winBox').innerHTML = !SOLO ? `${esc(w.name)} reached the ice-cream van first!<small>${w.right} right answers · best streak ${w.best} · knocked back ${w.bonks}&times;</small>`
    : `${w.you ? 'You reached the ice-cream van first!' : `${esc(w.name)} got there first. So close!`}<small>${me.right}/${me.asked} right answers · ${me.fast || 0} fast · best streak ${me.best} · knocked back ${me.bonks}&times;</small>`;
  $('ranks').style.setProperty('--n', ps.length);
  $('ranks').innerHTML = ps.map((p, k) => `<div class="rk px${k ? '' : ' first'}" style="--ring:${p.ring}"><span class="pl">${k + 1}</span>
    <canvas class="pv" data-char="${p.id}" data-key="f${k}" data-mood="${k ? 'clap' : 'cheer'}"></canvas><b>${esc(p.name)}</b>
    <div class="st"><span>ROWS<em>${clamp(p.ch.row - START, 0, LEN)}/${LEN}</em></span>${p.bot ? '' : `<span>RIGHT<em>${p.right}/${p.asked}</em></span><span>STREAK<em>${p.best}</em></span>`}<span>COINS<em>${p.coins || 0}</em></span></div></div>`).join('');
  if (SOLO && me && !G.paid) {   // (v14) your coins go into your purse: what you picked up plus a bonus for your place
    G.paid = true; const bonus = [12, 7, 4, 2][ps.indexOf(me)] || 0; G.earned = (me.coins || 0) + bonus; purse(purse() + G.earned);
    $('winBox').insertAdjacentHTML('beforeend', `<small class="earn">+${G.earned} COINS (${me.coins || 0} picked up + ${bonus} for your place) · purse ${purse()}</small>`);
  }
  $('cards').hidden = true; $('hud').hidden = true; $('tags').innerHTML = '';
  $('final').hidden = false;
  mountPV($('ranks'));
  startParty(ps);
}
// the party: a podium on the finish line, under the arch, the ice-cream van behind; confetti and fireworks
let party = null;
function startParty(order) {
  if (G && G.pick) for (const pk of G.pick) if (!pk.taken) { pk.taken = true; pk.m.parent?.remove(pk.m); }   // (v14) the podium is clear: no boxes, no coins, no shields
  order.forEach((p) => { p.ch.shield = false; });
  const spots = [[0, .42, '#ffd23f'], [-1.35, .28, '#d5dbe8'], [1.35, .16, '#e0a060'], [2.7, 0, null]];
  const list = [];
  order.forEach((p, k) => {
    const [x, h, col] = spots[k], c = p.ch;
    if (col) list.push([x, 0, 0, 1.05, h, 1, col], [x, h, 0, .55, .02, .45, '#ffffff']);
    c.state = 'party'; c.rank = k; c.partyPos = new THREE.Vector3(x, groundAt(FINISH) + h, -FINISH);
    c.stars.visible = false; c.body.rotation.set(0, 0, 0); c.body.scale.set(1, 1, 1); c.root.position.copy(c.partyPos);
  });
  const podium = new THREE.Mesh(boxesGeo(list), MAT); podium.userData.own = true; podium.castShadow = podium.receiveShadow = true;
  podium.position.z = -FINISH; world.add(podium);
  party = {next: T + .3, t0: T, g: 0, podium};   // (v15) the podium pops up out of the ground with a bounce
  const a = innerWidth / innerHeight; VIEW_W = a < 1.2 ? 6.5 : 9.5; FOCUS_ICON = .56; fitView();
  camGoal.set(0, 0, -FINISH);
}
function stopParty() { party = null; VIEW_W = 0; FOCUS_ICON = 0; fitView(); }
function firework() {
  const at = new THREE.Vector3(rand(-3.5, 3.5), rand(3, 4.2), -FINISH - rand(1, 3)), col = pick1(['#ff5fb8', '#ffd23f', '#3ddc84', '#5ec8ff', '#b07cff', '#ff8a2a']);
  for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, e = rand(-.6, .9); spawnPart(at.clone(), i % 4 ? col : '#ffffff', new THREE.Vector3(Math.cos(a) * Math.cos(e) * 3.2, Math.sin(e) * 3.2 + 1.5, Math.sin(a) * Math.cos(e) * 3.2), rand(.9, 1.4), .8); }
  tone(rand(500, 900), .25, 'triangle', .03, 0, 120);
}
$('againBtn').onclick = () => startRace();
$('lobbyBtn').onclick = () => toLobby();
$('reviewBtn').onclick = () => {
  const list = G.players.filter((p) => !p.bot).map((p) => `<h4 style="--ring:${p.ring}"><img src="${PORTRAIT[p.id]}" alt="">${esc(p.name.toUpperCase())} · ${p.right}/${p.asked}</h4>
    ${p.log.length ? `<ol>${p.log.map((q) => `<li>${esc(q.before)}<span class="r">${esc(q.right)}</span>${q.ok ? '' : ` <span class="w">${esc(q.pick || 'no answer')}</span>`}${esc(q.after)}</li>`).join('')}</ol>` : '<div class="none">No questions yet.</div>'}`).join('');
  openOv(`<div class="pop review px"><h3 class="ptitle">REVIEW ANSWERS</h3><div class="rv">${list}</div><div class="btns"><button class="pbtn yellow" data-act="close">CLOSE</button></div></div>`);
};
function toLobby() {
  stopTimer(); G = null; chars = [];
  $('final').hidden = true; $('hud').hidden = true; $('cards').hidden = true; $('tags').innerHTML = ''; $('big').innerHTML = '';
  buildWorld(LENS.medium); T = 0;
  $('lobby').hidden = false; renderLobby();
  lobbyView = true; stopParty();
  camGoal.set(0, 0, -START - .3); camAt.copy(camGoal); camV.set(0, 0, 0); fxs.length = 0;
}
function openOv(html) { $('ov').innerHTML = html; $('ov').hidden = false; }
function closeOv() { $('ov').hidden = true; $('ov').innerHTML = ''; if (G) G.paused = false; }
$('ov').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'close') closeOv();
  else if (act === 'restart') { closeOv(); startRace(); }
  else if (act === 'quit') { closeOv(); toLobby(); }
  else if (act === 'calm') { calm = !calm; store.set('calm', calm); b.textContent = `CALM MODE: ${calm ? 'ON' : 'OFF'}`; }   // (v15) less shaking, no flashes
});
$('menuBtn').onclick = () => {
  if (!G) return;
  G.paused = true;
  openOv(`<div class="pop px"><h3 class="ptitle">PAUSED</h3><div class="btns">
    <button class="pbtn green" data-act="close">&#9654; KEEP PLAYING</button><button class="pbtn" data-act="restart">START AGAIN</button><button class="pbtn dark" data-act="calm">CALM MODE: ${calm ? 'ON' : 'OFF'}</button><button class="pbtn pink" data-act="quit">QUIT TO MENU</button></div></div>`);
};

// ---------- the main loop
let last = performance.now();
// a weak board: if it draws fewer than ~35 frames a second, draw at a lower resolution (step by step, not below 0.6)
let pixNow = PIX, fpsN = 0, fpsT = performance.now();
function autoQuality(now) {
  if (QS.get('px')) return;
  fpsN++;
  if (now - fpsT < 2500) return;
  const fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now;
  if (fps < 35 && pixNow > .6 && !document.hidden) { pixNow = Math.max(.6, pixNow * .8); renderer.setPixelRatio(pixNow); fitView(); }
  // (v15) still slow at the lowest resolution: a smaller shadow map (the ground spots under the racers stay)
  else if (fps < 32 && pixNow <= .6 && sun.shadow.mapSize.x > 1024 && !document.hidden) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
}
function frame(now) {
  const rdt = Math.min(.05, (now - last) / 1000); last = now;
  autoQuality(now);
  FX.frames++;
  const paused = G && G.paused;
  // (v15) a hit freezes the world for a few frames (hit-stop); the winning hop and very close misses run in slow motion
  let dt = rdt;
  if (stopFor > 0) { stopFor -= rdt; dt = 0; } else if (slowFor > 0) { slowFor -= rdt; dt = rdt * slowK; }
  if (!paused) {
    T += dt;
    updateRows(dt);
    for (const c of (G ? chars : lobbyChars)) updateChar(c, dt);
    if (SOLO) updateRivals();
    updateParts(dt);
    spinPickups(dt);
    updateFx(dt);
    ambient(dt);
    honks();
    waterMats.forEach((m) => { m.map.offset.x += dt * .05 * m.userData.dir; m.map.offset.y = Math.sin(T * .8) * .03; });
    GLINT_MAT.map.offset.x -= dt * .09; GLINT_MAT.opacity = .38 + Math.sin(T * 2.3) * .18;
    pulseGoal();
    if (party && T > party.next && !$('final').hidden) {
      party.next = T + rand(.55, 1);
      if (Math.random() < .55) firework(); else if (G?.winner) confetti(G.winner.ch.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 22);
    }
  }
  renderPV();
  // the camera follows whoever's turn it is (in the lobby: the start line)
  // solo: on a phone held upright the view sits on your lane; held sideways your card covers the right, so the road moves left
  const camX = !SOLO ? 0 : innerWidth > innerHeight ? (innerHeight < 540 ? 2.6 : 0) : -.4;
  if (G && G.active >= 0) { const c = G.players[G.active].ch; camGoal.set(camX, 0, c.root.position.z); }
  else if (G && G.over && G.winner) camGoal.set(0, .3, -FINISH);
  else if (!G && !ICON) camGoal.set(0, 0, -START - .3);
  stepCam(rdt);
  sun.position.set(camAt.x - 6, 14, camAt.z + 5); sun.target.position.copy(camAt);
  renderer.render(scene, cam);
  updateTags();
  requestAnimationFrame(frame);
}
// ---------- (v14, the user: "make Hop Rush more like FoxKarts, all its features, to make it as fun") COINS on the road,
// ? BOXES that roll a POWER-UP, the rivals using theirs, and (solo) a purse and a SHOP of upgrades with a level.
// Every lane gets the same coins and boxes (fair in class); LUCKY BOXES adds a few more on your own lane.
const ITEMS = {
  rocket: {icon: '🚀', name: 'ROCKET', say: 'Tap it while you hop: fly over the traffic!'},
  shield: {icon: '🛡️', name: 'SHIELD', say: 'One free hit!'},
  snow: {icon: '❄️', name: 'SNOWBALL', say: 'Tap it to send a rival back!'},
  clock: {icon: '⏱️', name: '+5 SECONDS', say: 'Tap it for more time!'},
};
const ITEM_KEYS = Object.keys(ITEMS);
// what a box gives depends on your place, as in FoxKarts: the leader mostly shields and clocks, the back of the pack rockets and snowballs
const ITEM_ODDS = [[.12, .38, .1, .4], [.25, .25, .25, .25], [.35, .15, .3, .2], [.42, .1, .38, .1]];
function itemFor(p) {
  const order = G.players.slice().sort((a, b) => b.ch.row - a.ch.row), k = Math.round(order.indexOf(p) * 3 / Math.max(1, order.length - 1));
  let r = Math.random(); const o = ITEM_ODDS[k];
  for (let i = 0; i < 4; i++) { if (r < o[i]) return ITEM_KEYS[i]; r -= o[i]; }
  return 'rocket';
}
const BUBBLE_GEO = new THREE.IcosahedronGeometry(.62, 1), BUBBLE_MAT = new THREE.MeshLambertMaterial({color: '#7ad8ff', transparent: true, opacity: .35, flatShading: true, depthWrite: false});
const COIN_GEO = boxesGeo([[0, 0, 0, .44, .44, .1, '#ffd23f'], [0, .1, .055, .14, .24, .02, '#e09000'], [0, .1, -.055, .14, .24, .02, '#e09000']]);
const BOX_MAT = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d');
  g.fillStyle = '#7a3cff'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#b48cff'; g.fillRect(0, 0, 32, 3); g.fillRect(0, 0, 3, 32);
  g.fillStyle = '#4a1cb0'; g.fillRect(0, 29, 32, 3); g.fillRect(29, 0, 3, 32);
  g.fillStyle = '#ffd23f'; for (const [x, y, w, h] of [[11, 7, 10, 3], [19, 9, 3, 6], [14, 14, 6, 3], [14, 16, 3, 4], [14, 22, 3, 3]]) g.fillRect(x, y, w, h);
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({map: t});
})();
const BOX_GEO = new THREE.BoxGeometry(.52, .52, .52);
// the solo purse and upgrades
const purse = (v) => { if (v != null) store.set('coins', Math.max(0, Math.round(v))); return store.get('coins', 0); };
const UPS = [
  {id: 'spring', icon: '👟', name: 'SPRING SHOES', what: '+0.5 s of hop time on every crossing', max: 3},
  {id: 'lucky', icon: '🍀', name: 'LUCKY BOXES', what: 'More ? boxes on your lane', max: 3},
  {id: 'magnet', icon: '🧲', name: 'COIN MAGNET', what: 'Every coin you pick up is worth +1', max: 3},
  {id: 'helmet', icon: '⛑️', name: 'HELMET', what: 'Start every race with a shield', max: 1},
];
const UP_COST = [40, 90, 160];
const upLv = (id) => (SOLO ? (store.get('ups', {})[id] || 0) : 0);
const myLevel = () => 1 + UPS.reduce((s, u) => s + upLv(u.id), 0), MAX_LEVEL = 1 + UPS.reduce((s, u) => s + u.max, 0);
function placePickups() {
  G.pick = [];
  const lanes = G.players.map((p) => p.ch.x), lucky = (p) => (p.you ? upLv('lucky') : 0);
  for (let r = START + 1; r < FINISH; r++) {
    const row = rows[r]; if (!row) continue;
    const hz = row.type !== 'grass' && row.type !== 'finish';
    const kind = hz ? (Math.random() < .6 ? 'coin' : null) : (r > START + 1 && Math.random() < .5 ? 'box' : Math.random() < .35 ? 'coin' : null);
    G.players.forEach((p, i) => {
      const k = kind || (!hz && r > START + 1 && Math.random() < .1 * lucky(p) ? 'box' : null); if (!k) return;
      if (k === 'coin' && row.type === 'river' && !padAt(row, lanes[i])) return;
      const m = new THREE.Mesh(k === 'coin' ? COIN_GEO : BOX_GEO, k === 'coin' ? MAT : BOX_MAT);
      m.position.set(lanes[i], groundAt(r) + (k === 'coin' ? .32 : .45), 0); m.castShadow = true; row.g.add(m);
      const pk = {r, i, kind: k, m, taken: false}; (row.pick = row.pick || []).push(pk); G.pick.push(pk);
    });
  }
}
function spinPickups(dt) {
  if (!G || !G.pick) return;
  for (const pk of G.pick) if (!pk.taken && pk.m.parent?.visible) { pk.m.rotation.y += dt * (pk.kind === 'coin' ? 3 : 1.2); if (pk.kind === 'box') pk.m.position.y = groundAt(pk.r) + .45 + Math.sin(T * 3 + pk.r) * .06; }
}
function collect(c, r) {
  if (!G || !rows[r]?.pick) return;
  const p = G.players.find((x) => x.ch === c); if (!p) return;
  for (const pk of rows[r].pick) {
    if (pk.taken || pk.i !== p.i) continue;
    pk.taken = true; popOut(pk.m, pk.kind);   // (v15) the coin pops up spinning, the box bursts, instead of just vanishing
    if (pk.kind === 'coin') {
      const v = 1 + (p.you ? upLv('magnet') : 0); p.coins += v;
      if (!p.bot) { G.chime = T - (G.chimeT ?? -9) < 1.4 ? (G.chime || 0) + 1 : 0; G.chimeT = T; sfx.coin(G.chime); tagBurst(p, `+${v}`, '#ffd23f'); flyCoins(p, screenOf(pk.m), v); buzz(10); }
      splash(c.root.position, '#ffd23f', 6);
    }
    else if (p.item || p.rolling) { p.coins += 2; if (!p.bot) { sfx.coin(); tagBurst(p, '+2', '#ffd23f'); flyCoins(p, screenOf(pk.m), 2); } }
    else { if (!p.bot) { sfx.box(); shake(.15); buzz(15); FX.boxes++; } rollItem(p); }
    drawItem(p);
  }
}
// the roulette: the item slot on your card flicks through the power-ups, slows down and lands on one (FoxKarts style)
function rollItem(p) {
  const type = itemFor(p);
  if (p.bot) { if (type === 'shield') p.ch.shield = true; else p.item = type; return; }
  p.rolling = true; let k = 0; const me = G;
  const spin = () => {
    if (G !== me) return;
    const el = $('card' + p.i)?.querySelector('.c-item');
    if (k < 12) { if (el) { el.textContent = ITEMS[ITEM_KEYS[k % 4]].icon; el.classList.add('rolling'); bump(el, 1.25); } sfx.roll(); k++; setTimeout(spin, 45 + k * 10); return; }
    p.rolling = false; if (el) { el.classList.remove('rolling'); const r = el.getBoundingClientRect(); sparks(r.left + r.width / 2, r.top + r.height / 2, 14, ['#ffd23f', '#b48cff', '#ffffff']); }
    sfx.item(); tagBurst(p, ITEMS[type].name + '!', '#ffd23f'); buzz([10, 40, 20]);
    if ((G.hints = (G.hints || 0) + 1) <= 3) setTimeout(() => { if (G === me) tagBurst(p, ITEMS[type].say.toUpperCase(), '#ffffff'); }, 900);   // (the first few times: how to use it)
    if (type === 'shield') { p.ch.shield = true; sfx.shield(); } else p.item = type;
    drawItem(p, true);
  };
  spin();
}
function drawItem(p, fresh) {
  const card = $('card' + p.i); if (!card) return;
  const el = card.querySelector('.c-item'), co = card.querySelector('.c-coins');
  if (co) co.textContent = (p.coins || 0) - (p.flying || 0);   // (v15) coins still flying to the counter are added when they land
  if (!el || p.rolling) return;
  el.textContent = p.item ? ITEMS[p.item].icon : '';
  el.classList.toggle('full', !!p.item); el.title = p.item ? `${ITEMS[p.item].name}: ${ITEMS[p.item].say}` : '';
  if (fresh && p.item) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
function useItem(p) {
  if (!G || G.over || !p || p.bot || !p.item || p.rolling || G.paused) return;
  if (G.active !== p.i || (G.phase !== 'q' && G.phase !== 'hop')) { tagBurst(p, 'ON YOUR TURN!', '#c9cdf8'); return; }
  const c = p.ch, it = p.item;
  if (it === 'rocket') {
    if (G.phase !== 'hop' || c.state !== 'idle' || c.row >= G.target) { tagBurst(p, 'USE IT WHEN YOU HOP!', '#c9cdf8'); return; }
    p.item = null; drawItem(p); fly(c, G.target); return;
  }
  if (it === 'clock') { p.item = null; drawItem(p); G.extra = (G.extra || 0) + 5000; sfx.plus(); tagBurst(p, '+5 SECONDS!', '#7af8ff');
    const bar = $('card' + p.i)?.querySelector('.c-bar'); if (bar) { bar.classList.remove('plus'); void bar.offsetWidth; bar.classList.add('plus'); const r = bar.getBoundingClientRect(); sparks(r.left + r.width / 2, r.top + r.height / 2, 12, ['#7af8ff', '#ffffff']); }
    return; }
  if (it === 'snow') {
    const others = G.players.filter((o) => o !== p && o.ch.row > START && o.ch.state !== 'party');
    if (!others.length) { tagBurst(p, 'NOBODY TO HIT YET!', '#c9cdf8'); return; }
    G.paused = true;
    openOv(`<div class="pop px aim"><h3 class="ptitle">❄️ WHO GETS THE SNOWBALL?</h3><div class="aims">${others.map((o) => `<button class="pbtn dark" data-aim="${o.i}" style="--ring:${o.ring}"><img src="${PORTRAIT[o.id]}" alt=""><b>${esc(o.name)}</b><small>${clamp(o.ch.row - START, 0, LEN)}/${LEN}</small></button>`).join('')}</div><button class="pbtn" data-act="close">KEEP IT</button></div>`);
  }
}
// choose who gets the snowball (the race waits while you choose)
$('ov').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aim]'); if (!b || !G) return;
  const p = G.players[G.active], t = G.players[+b.dataset.aim]; closeOv();
  if (p && p.item === 'snow' && t) { p.item = null; drawItem(p); throwSnow(p, t); }
});
function botThrow(p) {
  const others = G.players.filter((o) => o !== p && o.ch.row > START && o.ch.row >= p.ch.row - 1);
  if (!others.length) return;
  const t = others.sort((a, b) => b.ch.row - a.ch.row)[0]; p.item = null; throwSnow(p, t);
}
// a snowball flies in an arc from one racer to another and knocks them back over their last crossing
function throwSnow(from, to) {
  sfx.throw();
  const ball = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshLambertMaterial({color: '#ffffff'})); scene.add(ball);
  const a = from.ch.root.position.clone().add(new THREE.Vector3(0, 1, 0)), t0 = performance.now(), me = G;
  if (!to.bot || from.you) tagBurst(to, from.you ? 'SNOWBALL!' : `${from.name.toUpperCase()} THROWS!`, '#bfe9ff');
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / 650), b = to.ch.root.position.clone().add(new THREE.Vector3(0, .7, 0));
    ball.position.lerpVectors(a, b, k); ball.position.y += Math.sin(Math.PI * k) * 2.2; ball.rotation.x += .3; ball.rotation.z += .2;
    if (Math.random() < .7) spawnPart(ball.position.clone(), pick1(['#ffffff', '#d8f4ff']), new THREE.Vector3(rand(-.4, .4), rand(-.2, .6), rand(-.4, .4)), .35, .6);   // (v15) a snowy trail
    if (k < 1 && G === me) { requestAnimationFrame(step); return; }
    scene.remove(ball); if (G !== me || to.ch.state === 'party') return;
    if (to.ch.state === 'bonk') return;
    bonk(to.ch, 'snow');
  };
  step();
}
// the safe line before a racer's last crossing (where a snowball sends them)
function prevLine(r) {
  let k = r - 1;
  while (k > START && isSafe(k)) k--;
  while (k > START && !isSafe(k)) k--;
  return Math.max(START, k);
}
// a jetpack hop straight over the traffic to the safe line
function fly(c, to) {
  if (c.state !== 'idle') return;
  c.state = 'hop'; c.t = 0; c.from = c.row; c.to = to; c.fly = true; c.face = Math.PI; c.queued = false;
  c.pre = 0;
  if (!c.quiet) { sfx.rocket(); punch(-.12); shake(.25); buzz([20, 30, 40]); speedLines(.95); }   // (v15) the view pulls back, speed lines, a rumble
  const pl = G && G.players.find((x) => x.ch === c); if (pl && !pl.bot) tagBurst(pl, 'ROCKET!', '#ff8a1e');
}
function tagBurst(p, txt, color) {
  const el = $('tag' + p.i), r = el?.getBoundingClientRect();
  if (r && r.width) burst(r.left + r.width / 2, r.top - 18, txt, color);
  else { const c = $('card' + p.i)?.getBoundingClientRect(); if (c) burst(c.left + c.width / 2, c.top - 10, txt, color); }
}
// the shop (solo lobby): spend coins on upgrades; every upgrade is one level
function openShop() {
  const ups = store.get('ups', {}), coins = purse();
  openOv(`<div class="pop px shop"><h3 class="ptitle">SHOP</h3><div class="shop-top"><span class="lvp">LEVEL ${myLevel()}<small>/${MAX_LEVEL}</small></span><span class="lvbar"><i style="width:${((myLevel() - 1) / (MAX_LEVEL - 1) * 100).toFixed(1)}%"></i></span><span class="cpill"><i class="gc"></i>${coins}</span></div>
    <div class="ups">${UPS.map((u) => { const lv = ups[u.id] || 0, max = lv >= u.max, cost = UP_COST[lv];
      return `<div class="up"><span class="ic">${u.icon}</span><span class="tx"><b>${u.name}</b><small>${u.what}</small><span class="pips">${Array.from({length: u.max}, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></span>${max ? '<span class="mx">MAX</span>' : `<button class="pbtn ${coins >= cost ? 'yellow' : 'dark'}" data-buy="${u.id}"><i class="gc"></i>${cost}</button>`}</div>`; }).join('')}</div>
    <button class="pbtn" data-act="close">DONE</button></div>`);
}
$('ov').addEventListener('click', (e) => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const ups = store.get('ups', {}), u = UPS.find((x) => x.id === b.dataset.buy), lv = ups[u.id] || 0, cost = UP_COST[lv];
  if (lv >= u.max) return;
  if (purse() < cost) { sfx.wrong(); burst(innerWidth / 2, innerHeight * .3, 'NOT ENOUGH COINS', '#ff4d6d'); return; }
  const lv0 = myLevel(); purse(purse() - cost); ups[u.id] = lv + 1; store.set('ups', ups); sfx.item();
  openShop(); renderLobby();
  burst(innerWidth / 2, innerHeight * .3, `LEVEL ${lv0} → ${myLevel()}!`, '#ffd23f');
  const bar = document.querySelector('#ov .lvbar i'); if (bar) { const w = bar.style.width; bar.style.transition = 'none'; bar.style.width = ((lv0 - 1) / (MAX_LEVEL - 1) * 100) + '%'; void bar.offsetWidth; bar.style.transition = 'width .7s'; bar.style.width = w; }
});

// ---------- the computer rivals (solo): each "answers" a question in its own time, right or wrong, then hops to the next
// safe line, waiting for a gap in the traffic (now and then hopping without looking). Knocked back: it tries again.
function updateRivals() {
  if (!G || G.over || !G.botsOn) return;
  for (const p of G.players) {
    if (!p.bot) continue;
    const a = p.ai, c = p.ch;
    if (a.state === 'think') {
      if (T < a.until) continue;
      if (p.item === 'snow' && Math.random() < .5) botThrow(p);
      if (p.item === 'clock') p.item = null;
      if (Math.random() < a.lv.acc) { a.state = 'cross'; a.target = nextSafe(c.row); a.nextHop = T + rand(.2, .5); a.from = c.row; a.deadline = T + hopSecs(a.target - c.row, G.time - (a.took || 0)); }
      else { a.took = rand(...a.lv.think) * .8; a.until = T + a.took; } // wrong: another question
    } else if (a.state === 'cross') {
      if (c.state !== 'idle' || T < a.nextHop) continue;
      if (p.item === 'rocket' && c.row < a.target && hitSoon(c.row + 1, c.x, HOP_T + .3)) { p.item = null; fly(c, a.target); a.nextHop = T + 1.2; continue; }
      if (c.row >= a.target) { a.state = 'think'; a.took = rand(...a.lv.think); a.until = T + a.took + rand(...(a.lv.rest || [0, 0])); continue; }
      // (v12) the same rule as yours: out of hop time still on the road, back to the safe line and another question
      if (T > a.deadline) { a.state = 'think'; a.took = rand(...a.lv.think); a.until = T + a.took; if (!isSafe(c.row)) bonk(c, 'back'); continue; }
      const careless = Math.random() < a.lv.careless * .05; // per frame, so a rare slip
      const stuck = !isSafe(c.row) && hitSoon(c.row, c.x, .5); // standing on a road / sinking pad: better to move
      if (careless || !hitSoon(c.row + 1, c.x, HOP_T + .3) || (stuck && !hitSoon(c.row + 1, c.x, HOP_T))) { hop(c); a.nextHop = T + rand(.12, .35); }
    }
  }
}

// a car honks when it nearly hits the player whose turn it is
function honks() {
  if (!G || G.active < 0 || G.phase !== 'hop') return;
  const c = G.players[G.active].ch, row = rows[c.row + 1];
  if (row?.type !== 'road') return;
  for (const car of row.cars) if (Math.abs(car.x - c.x) < car.len / 2 + 1.2 && T - car.honk > 3 && Math.random() < .02) { car.honk = T; sfx.honk(); }
}

// ---------- (v15) GAME FEEL (the research note "Mobile Game Feel and Lookalikes"): a crouch before every hop, a stretch in the
// air, a springy landing with a dust puff; a springy camera with a small kick on each hop and a shake on hits; hit-stop and a
// white flash when something gets you; CLOSE! for near misses; coins that pop and fly to your counter with rising chimes;
// ? boxes that burst; FAST! coins for quick right answers; streaks; a soft wrong answer; haptics (Android); fish and swaying
// trees. CALM MODE (pause menu) or the phone's "reduce motion" setting: no shakes, flashes or zoom punches.
const FX = {frames: 0, hops: 0, lands: 0, close: 0, coinsFlown: 0, boxes: 0, hitStops: 0, flashes: 0, streaks: 0, fast: 0, shakes: 0};
let calm = store.get('calm', null) ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
const PRE_T = .05;
const isMine = (c) => !!(G && G.phase === 'hop' && G.active >= 0 && G.players[G.active]?.ch === c);
// haptics: short buzzes on Android phones (iPhones have none); off when the sound is off
function buzz(p) { if (muted) return; try { navigator.vibrate?.(p); } catch {} }
// the ground spot, the ice cube
const BLOB_GEO = new THREE.PlaneGeometry(.95, .95).rotateX(-Math.PI / 2);
const BLOB_MAT = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(cv), color: '#1b2350', transparent: true, opacity: .42, depthWrite: false});
})();
const ICE_GEO = new THREE.BoxGeometry(1, 1.3, 1), ICE_MAT = new THREE.MeshLambertMaterial({color: '#bfeeff', transparent: true, opacity: .6, emissive: '#3a8fc8', emissiveIntensity: .25, depthWrite: false});
BUBBLE_MAT.emissive = new THREE.Color('#2a9be8'); BUBBLE_MAT.emissiveIntensity = .35;   // the shield bubble glows a little
const FLASH_MAT = new THREE.MeshBasicMaterial({color: '#ffffff'});

// ---- the camera: a spring that follows the goal, a kick forward on each hop, "trauma" shake on hits, zoom punches
const camV = new THREE.Vector3(), _cd = new THREE.Vector3();
let trauma = 0, kick = 0, zoomP = 0;
function shake(a) { if (!calm) { trauma = Math.min(1, trauma + a); FX.shakes++; } }
function camKick(a) { kick = Math.max(kick, a); }
function punch(z) { if (!calm) zoomP = Math.abs(z) > Math.abs(zoomP) ? z : zoomP; }
const wob = (t) => Math.sin(t) * .5 + Math.sin(t * 2.3 + 1.3) * .3 + Math.sin(t * 4.7 + 2.1) * .2;   // smooth noise, -1…1
function stepCam(dt) {
  _cd.copy(camGoal).sub(camAt);
  if (_cd.lengthSq() > 400) { camAt.copy(camGoal); camV.set(0, 0, 0); }   // a jump across the map: no long swoop
  camV.addScaledVector(_cd, 60 * dt).multiplyScalar(Math.exp(-12 * dt)); camAt.addScaledVector(camV, dt);
  cam.position.copy(camAt).add(CAM_OFF); cam.lookAt(camAt);
  const tt = performance.now() / 1000, s = trauma * trauma;
  cam.position.x += wob(tt * 21) * .25 * s; cam.position.z += wob(tt * 21 + 40) * .25 * s - kick;
  if (s) cam.rotateZ(wob(tt * 17 + 90) * .035 * s);
  trauma = Math.max(0, trauma - 1.5 * dt); kick *= Math.exp(-dt * 11); zoomP *= Math.exp(-dt * 7);
  const z = 1 + (Math.abs(zoomP) < .002 ? 0 : zoomP);
  if (z !== cam.zoom) { cam.zoom = z; cam.updateProjectionMatrix(); }
}
// ---- time: hit-stop and slow motion (the frame loop reads these)
let stopFor = 0, slowFor = 0, slowK = 1;
function hitStop(s) { stopFor = Math.max(stopFor, s); FX.hitStops++; }
function slowMo(k, s) { slowK = k; slowFor = s; }
// ---- flashes
function flashChar(c, ms = 60) {
  if (calm) return; FX.flashes++;
  const ms0 = []; c.rig.root.traverse((o) => { if (o.isMesh) { ms0.push(o); o.material = FLASH_MAT; } });
  setTimeout(() => ms0.forEach((o) => { o.material = MAT; }), ms);
}
function flashScreen(color, op, ms = 200) {
  if (calm) return; const el = $('flash'); if (!el || !el.animate) return;
  el.style.background = color; el.animate([{opacity: op}, {opacity: 0}], {duration: ms, easing: 'ease-out'});
}
function speedLines(s) { const el = $('speed'); if (!el || calm) return; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), s * 1000); }
// when something gets YOU: freeze, flash, shake and buzz, sized to the hit
function hitFx(c, kind) {
  const H = {car: [.07, .45, .3, [30, 40, 30]], train: [.1, .8, .45, [40, 40, 70]], water: [.05, .25, 0, 30], snow: [.06, .35, .2, [20, 30, 20]], shield: [.05, .2, .15, 20]}[kind];
  if (!H) return;
  hitStop(H[0]); shake(H[1]); if (kind !== 'water') flashChar(c); if (H[2]) flashScreen('#ffffff', H[2], 160); buzz(H[3]);
  if (kind === 'car' || kind === 'train') sfx.thud();
}
// ---- particles that read well: a dust puff at the feet, a ring of sparkles, a rocket trail
function dust(p, n = 6) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rand(-.3, .3), v = rand(1.1, 1.9);
    spawnPart(new THREE.Vector3(p.x + Math.cos(a) * .18, p.y + .04, p.z + Math.sin(a) * .18), pick1(['#f6f1e4', '#e4dccb', '#ffffff']), new THREE.Vector3(Math.cos(a) * v, rand(.5, 1.2), Math.sin(a) * v), rand(.22, .36), .75); }
}
function ring(p, color, n = 12, up = .5) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2;
    spawnPart(new THREE.Vector3(p.x + Math.cos(a) * .3, p.y + up, p.z + Math.sin(a) * .3), i % 3 ? color : '#ffffff', new THREE.Vector3(Math.cos(a) * 2.6, rand(1.6, 2.8), Math.sin(a) * 2.6), rand(.4, .6), .8); }
}
function rocketTrail(pos) {
  spawnPart(new THREE.Vector3(pos.x + rand(-.1, .1), pos.y + .15, pos.z + .2), pick1(['#ffd23f', '#ff8a1e', '#fff3a0']), new THREE.Vector3(rand(-.5, .5), -1.8, rand(.6, 1.6)), .4, .9);
  if (Math.random() < .6) spawnPart(new THREE.Vector3(pos.x + rand(-.15, .15), pos.y, pos.z + .3), pick1(['#e8e8f0', '#c8c8d4']), new THREE.Vector3(rand(-.4, .4), .4, rand(.2, .8)), .7, 1.5);
}
// a lily pad dips when you land on it
function padDip(pd) { const t = T - (pd.dip ?? -9); return t < .6 ? .08 * Math.exp(-t * 6) * Math.cos(t * 9) : 0; }
function landFx(c, flew) {
  const row = rows[c.row]; if (!row) return;
  FX.lands++;
  c.landT = T;
  if (row.type === 'river') { const pd = padAt(row, c.x); if (pd) pd.dip = T; splash(c.root.position, '#8fd3ff', c.quiet ? 4 : 10); }
  else dust(c.root.position, flew ? 16 : c.quiet ? 3 : 6);
  if (!c.quiet) { if (flew) { shake(.3); sfx.thud(); buzz(30); } else sfx.land(); }
}
// ---- near misses: hopping off a lane just before a car (or a train, or a sinking pad), or landing just behind a car
function closeCall(c, r, leaving) {
  const row = rows[r]; if (!row) return 0;
  if (row.type === 'road') {
    for (const car of row.cars) {
      const gap = Math.abs(car.x - c.x) - (car.len / 2 + .3), towards = (c.x - car.x) * row.dir > 0;
      if (gap > 0 && gap < (leaving ? 1.1 : .75) && towards === leaving) return gap < .35 ? 2 : 1;
    }
  }
  if (leaving && row.type === 'rail' && row.on) { const d = (c.x - (row.tx + row.dir * TRAIN_CAR / 2)) * row.dir; if (d > 0 && d < 7) return d < 3 ? 2 : 1; }
  if (leaving && row.type === 'river') { const pd = padAt(row, c.x); if (pd && padState(row, pd, T) === 'warn') return 1; }
  return 0;
}
function nearMiss(c, level) {
  const key = `${G.turn}:${G.target}`; if (G.closeKey === key) return;   // once per crossing
  G.closeKey = key; FX.close++;
  const p = G.players.find((x) => x.ch === c); if (!p) return;
  p.coins += 1; p.close = (p.close || 0) + 1;
  sfx.whoosh(); buzz(12); tagBurst(p, 'CLOSE! +1', '#7af8ff');
  flyCoins(p, screenOf(c.root), 1);
  if (level > 1) slowMo(.5, .2);
}
// ---- coins: the 3D coin pops up spinning, and a little coin flies on a curve to your counter, which bumps as it lands
const fxs = [];
function popOut(m, kind) { fxs.push({m, kind, t: 0, y0: m.position.y}); }
function updateFx(dt) {
  for (let i = fxs.length - 1; i >= 0; i--) {
    const f = fxs[i]; f.t += dt;
    if (f.kind === 'coin') {
      const k = f.t / .3; f.m.position.y = f.y0 + Math.sin(Math.min(1, k) * Math.PI * .5) * .9; f.m.rotation.y += dt * 28;
      f.m.scale.setScalar(k < .45 ? 1 + k * 1.3 : Math.max(.01, 1.6 - (k - .45) * 2.9));
      if (k >= 1) { f.m.parent?.remove(f.m); fxs.splice(i, 1); }
    } else {   // the ? box swells for a moment, then bursts into purple and gold cubes
      const k = f.t / .14; f.m.scale.setScalar(1 + k * .5); f.m.rotation.y += dt * 18;
      if (k >= 1) {
        const p = new THREE.Vector3(); f.m.getWorldPosition(p);
        for (let j = 0; j < 16; j++) spawnPart(p.clone(), pick1(['#7a3cff', '#b48cff', '#ffd23f', '#ffffff']), new THREE.Vector3(rand(-2.5, 2.5), rand(2, 4.5), rand(-2.5, 2.5)), rand(.45, .7), 1.1);
        f.m.parent?.remove(f.m); fxs.splice(i, 1);
      }
    }
  }
  if (party) { const t = T - party.t0; party.g = t >= .8 ? 1 : 1 - Math.exp(-t * 7) * Math.cos(t * 13); party.podium.scale.y = Math.max(.001, party.g); }
}
const _sv = new THREE.Vector3();
function screenOf(o) { o.getWorldPosition(_sv); _sv.y += .3; _sv.project(cam); return [(_sv.x + 1) / 2 * innerWidth, (1 - _sv.y) / 2 * innerHeight]; }
function bump(el, s = 1.35) { el?.animate?.([{transform: `scale(${s})`}, {transform: 'scale(1)'}], {duration: 220, easing: 'cubic-bezier(.3,1.6,.5,1)'}); }
function flyCoins(p, [x0, y0], n) {
  const co = $('card' + p.i)?.querySelector('.c-coins'); if (!co || !document.body.animate) { drawItem(p); return; }
  const me = G, m = Math.min(n, 6); p.flying = (p.flying || 0) + n; drawItem(p);
  for (let k = 0; k < m; k++) {
    const carry = k === m - 1 ? n - (m - 1) : 1, el = document.createElement('i'); el.className = 'gc flyc'; el.style.left = x0 + 'px'; el.style.top = y0 + 'px'; document.body.appendChild(el);
    const r = co.getBoundingClientRect(), dx = r.left + 9 - x0, dy = r.top + r.height / 2 - y0;
    const a = el.animate([{transform: 'translate(-50%,-50%) scale(.4)', easing: 'ease-out'},
      {transform: `translate(calc(-50% + ${rand(-22, 22).toFixed(0)}px),calc(-50% - ${46 + k * 6}px)) scale(1.3)`, offset: .28, easing: 'cubic-bezier(.55,0,.9,.5)'},
      {transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.75)`}], {duration: 560, delay: k * 40, fill: 'both'});
    FX.coinsFlown++;
    a.onfinish = () => { el.remove(); if (G !== me) return; p.flying = Math.max(0, p.flying - carry); drawItem(p); bump(co, 1.4); if (k === m - 1) tone(N(100), .05, 'square', .03); };
  }
}
// ---- screen sparks (DOM): little squares bursting out of a button or the item slot
function sparks(x, y, n = 12, cols = ['#ffd23f', '#3ddc84', '#ffffff']) {
  if (!document.body.animate) return; if (calm) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i'); el.className = 'spark'; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.background = cols[i % cols.length]; document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2, d = rand(40, 110);
    el.animate([{transform: 'translate(-50%,-50%) scale(1)', opacity: 1}, {transform: `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(0)}px),calc(-50% + ${(Math.sin(a) * d - 24).toFixed(0)}px)) scale(.2)`, opacity: 0}],
      {duration: rand(420, 650), easing: 'cubic-bezier(.2,.8,.4,1)'}).onfinish = () => el.remove();
  }
}
// ---- the answer moment. Right: sparks out of the button, a cheer on the road, a zoom punch; a FAST answer gets bonus coins
// (+1, or +2 when very fast; the hop rule is unchanged); 2+ right in a row shows the streak. Wrong: soft, a little wobble.
function rightFx(p, btn, at) {
  const cx = at.left + at.width / 2, cy = at.top + at.height / 2, c = p.ch;
  sparks(cx, cy, 16); punch(.05); buzz([12, 30, 12]);
  c.mood = {kind: 'cheer', t0: T, until: T + .42};
  ring(c.root.position, '#ffd23f', 12, .6);
  const sp = G.left / Math.max(1, G.time), big = sp >= .75, fast = big || sp >= .5, me = G;
  const cr = $('card' + p.i)?.getBoundingClientRect(), bx = cr ? cr.left + cr.width / 2 : cx, by = cr ? cr.top - 26 : at.top - 46;   // the pop-ups sit just above the card
  if (fast) {
    const v = big ? 2 : 1; p.coins += v; p.fast = (p.fast || 0) + 1; FX.fast++; sfx.fast(big);
    setTimeout(() => { if (G !== me) return; burst(bx, by, big ? `SUPER FAST! +${v}` : `FAST! +${v}`, big ? '#ffd23f' : '#7af8ff', 'fastb'); flyCoins(p, [bx, by], v); }, 220);
  }
  if (p.streak >= 2) {
    FX.streaks++; const cols = ['#3ddc84', '#ffd23f', '#ff8a2a', '#ff5fb8'];
    sfx.streak(p.streak);
    setTimeout(() => { if (G === me) burst(bx, by - (fast ? 52 : 0), `x${p.streak} STREAK!`, cols[Math.min(3, p.streak - 2)], p.streak >= 4 ? 'streakb hot' : 'streakb'); }, fast ? 380 : 200);
  }
}
function wrongFx(p, card) {
  p.ch.mood = {kind: 'sad', t0: T, until: T + 1.3};
  card.classList.remove('wobble'); void card.offsetWidth; card.classList.add('wobble'); buzz(25);
}
// ---- the finish: confetti cannons from both posts of the arch and a golden flash
function winFx(p) {
  flashScreen('#fff3c0', .45, 380); buzz([60, 50, 120]); punch(.08);
  for (const sx of [-5.4, 5.4]) for (let i = 0; i < 34; i++) spawnPart(new THREE.Vector3(sx, 2.8, -FINISH), pick1(['#ff5fb8', '#ffd23f', '#3ddc84', '#5ec8ff', '#b07cff', '#ff8a2a']),
    new THREE.Vector3(-Math.sign(sx) * rand(1.5, 4.5), rand(3, 7), rand(-1.5, 1.5)), rand(1.4, 2.2));
}
// ---- little life: now and then a fish jumps out of a river near the camera
const FISH = new THREE.Mesh(boxesGeo([[0, 0, 0, .34, .16, .12, '#ff8a2a'], [-.22, .02, 0, .12, .12, .04, '#ff5a1f'], [.12, .09, .065, .04, .04, .01, '#20232e'], [.02, .16, 0, .1, .05, .04, '#ff5a1f']], 1, false), MAT);
FISH.visible = false; scene.add(FISH);
let fishNext = 3, fishJump = null;
function ambient(dt) {
  if (fishJump) {
    const f = fishJump, k = (f.t += dt) / .75;
    FISH.position.set(f.x + f.d * k * .9, -.34 + Math.sin(Math.PI * Math.min(1, k)) * .85, f.z); FISH.rotation.z = (.9 - k * 1.8) * f.d; FISH.rotation.y = f.d > 0 ? 0 : Math.PI;
    if (k >= 1) { FISH.visible = false; fishJump = null; splash(FISH.position, '#8fd3ff', 5); }
    return;
  }
  if (T < fishNext) return;
  fishNext = T + rand(2.5, 5.5);
  const near = rows.filter((r) => r.type === 'river' && Math.abs(r.r + camAt.z) < 6); if (!near.length) return;
  const r = pick1(near), x = pick1([-1, 1]) * rand(4.6, 6.5);
  fishJump = {t: 0, x, z: -r.r, d: x > 0 ? -1 : 1}; FISH.visible = true; splash(new THREE.Vector3(x, -.3, -r.r), '#8fd3ff', 4);
}

// ---------- start
buildWorld(LENS.medium);
renderLobby();
camGoal.set(0, 0, -START - .3); camAt.copy(camGoal);
const ICON = QS.has('icon'); // ?icon: a still picture for the app icon (Foxino jumping over a road, a car coming)
if (ICON) {
  $('lobby').hidden = true; lobbyView = false;
  lobbyChars.forEach((c) => world.remove(c.root)); lobbyChars = [];
  const r = rows.findIndex((row, i) => i > START + 2 && row.type === 'road' && rows[i - 1].type === 'grass');
  const row = rows[r]; row.dir = -1; row.speed = 0;
  row.cars.forEach((c, k) => { c.x0 = k ? 30 : 1.75; c.m.rotation.y = Math.PI; });
  const fox = makeChar(crewOf('foxino'), 0), pix = makeChar(crewOf('pix'), -1.7);
  fox.state = pix.state = 'icon';
  fox.root.position.set(-.25, .55, -r + .2); fox.body.rotation.y = .55; fox.body.scale.set(.95, 1.08, .95);
  pix.root.position.set(-1.45, 0, -r + 1.05); pix.body.rotation.y = .3;
  lobbyChars = [fox, pix];
  VIEW_W = +QS.get('icon') || 4.4; FOCUS_ICON = .56;
  camGoal.set(-.45, 0, -r + .35); camAt.copy(camGoal);
  T = 0; fitView();
}
requestAnimationFrame(frame);

// for the automatic tests
function hitSoon(r, x, dt) {
  const row = rows[r]; if (!row) return false;
  if (row.type === 'road') return row.cars.some((c) => { for (let k = 0; k <= 4; k++) { const t = T + dt * k / 4, cx = -HALF + (((c.x0 + HALF + row.dir * row.speed * t) % row.span) + row.span) % row.span; if (Math.abs(cx - x) < c.len / 2 + .5) return true; } return false; });
  if (row.type === 'rail') return row.on || T > row.next - 2.2;
  if (row.type === 'river') { const pd = padAt(row, x); return !pd || padState(row, pd, T) !== 'up' || padState(row, pd, T + dt) !== 'up'; }
  return false;
}
window.HR = {FX, info: () => ({calls: renderer.info.render.calls, tris: renderer.info.render.triangles, parts: PARTS.count}), get calm() { return calm; }, set calm(v) { calm = !!v; }, closeCall, get trauma() { return trauma; }, get G() { return G; }, hitSoon, get rows() { return rows; }, chars: () => chars, answer, tapHop, danger, START: () => START, FINISH: () => FINISH,
  rightIndex: () => G?.cur?.words.findIndex((w) => w.ok), setT: (t) => { T = t; }, startRace, SOLO, useItem, purse, openShop, rows: () => rows};
