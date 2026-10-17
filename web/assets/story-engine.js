(function (root) {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const MODES = ['opening','reveal','scene','interaction','result','ending','dead'];
  const SKILL_NAMES = { edge:'裂阙刃', refine:'逆文归流', chain:'回锋追契', vamp:'破障回息', guard:'守缺成圆', vital:'不折命火', reserve:'纳契为海', fury:'开锋定局' };
  class StoryEngine {
    constructor(seed) {
      if (typeof root.TextEngine !== 'function') throw new Error('TextEngine must load before StoryEngine');
      this.base = new root.TextEngine(seed);
      this.newRun();
    }
    get s() { return this.base.s; }
    _report() {
      return { chapter: this.s.chapter, fromLevel: this.s.level, toLevel: this.s.level,
        fromAtk: this.s.atk, toAtk: this.s.atk, sand: 0, fights: 0, lines: [] };
    }
    _newFlow() {
      return { mode: 'opening', focus: 'edge', flags: { opening: null, decisions: [], replies: [] }, report: this._report() };
    }
    newRun() { this.base.newRun(); this.flow = this._newFlow(); return this.s; }
    _before() { return { shards: this.s.shards, total: this.s.total }; }
    _record(before) {
      const r = this.flow.report;
      r.toLevel = this.s.level; r.toAtk = this.s.atk;
      r.sand += this.s.shards - before.shards; r.fights += this.s.total - before.total;
    }
    _line(text) {
      this.flow.report.lines.push(text);
      if (this.flow.report.lines.length > 300) this.flow.report.lines.shift();
    }
    _pick() {
      const u = this.s.upgrades, focus = this.flow.focus;
      const priority = focus === 'edge'
        ? [...(u.refine < 1 ? ['refine'] : []), ...(u.edge < 2 ? ['edge'] : []), 'edge','refine','fury','reserve','chain','guard','vamp','vital']
        : [...(u.guard < 1 ? ['guard'] : []), ...(u.chain < 2 ? ['chain'] : []), 'chain','guard','vamp','edge','refine','fury','reserve','vital'];
      return priority.find(id => this.s.choices.includes(id));
    }
    _settle() {
      if (this.s.phase === 'reward') {
        const before = this._before();
        if (!this.base.breakthrough()) throw new Error('Cannot settle reward');
        this._record(before); this._line('就地突破至第' + this.s.level + '重，刀势' + this.s.atk + '。');
      }
      if (this.s.phase === 'upgrade') {
        const before = this._before(), id = this._pick();
        if (!id || !this.base.upgrade(id)) throw new Error('Cannot choose a legal upgrade');
        this._record(before); this._line('领悟武学：' + SKILL_NAMES[id] + '。');
      }
    }
    _playThrough(lastFight) {
      for (let guard = 0; guard < 10000; guard++) {
        this._settle();
        if (this.s.phase !== 'battle' || this.s.fight > lastFight) return;
        const id = this.flow.focus === 'return' ? 'counter'
          : this.s.route === 'force' ? 'cut' : (this.s.ink >= this.base.cost() ? 'refine' : 'counter');
        const before = this._before();
        if (!this.base.action(id)) throw new Error('Cannot advance battle');
        for (const line of this.s.log) this._line(line);
        this._record(before);
      }
      throw new Error('Battle exceeds the supported turn limit');
    }
    _locate() {
      const p = this.s.phase;
      if (p === 'awakening') return 'opening';
      if (p === 'scene') return 'scene';
      if (p === 'battle') return this.s.fight === 2 ? 'interaction' : 'scene';
      if (p === 'chapterclear' || p === 'destiny') return 'result';
      if (p === 'ending' || p === 'dead') return p;
      throw new Error('Pending reward must be settled before locating the story');
    }
    choose(id) {
      const mode = this.flow.mode;
      const allowed = mode === 'opening' ? ['defy','rescue'] : mode === 'reveal' ? ['edge','return']
        : mode === 'scene' ? ['force','refine'] : mode === 'interaction' ? ['bold','bond']
        : mode === 'result' ? (this.s.phase === 'destiny' ? ['wander','school'] : ['trust','independent']) : [];
      if (!allowed.includes(id)) return false;
      const before = this.snapshot();
      try {
        if (mode === 'opening') {
          this.flow.flags.opening = id;
          this.flow.report = this._report();
          this.base.awaken(); this.base.route(id === 'defy' ? 'force' : 'refine');
          this._playThrough(0);
          this.flow.mode = this.s.phase === 'dead' ? 'dead' : 'reveal';
        } else if (mode === 'reveal') {
          this.flow.focus = id; this._playThrough(2); this.flow.mode = this._locate();
        } else if (mode === 'scene') {
          // Migrated saves can already be halfway through fight zero or one.
          // Keeping the existing route and enemy preserves every old turn.
          if (this.s.phase === 'scene') { this.flow.report = this._report(); this.base.route(id); }
          this._playThrough(1); this.flow.mode = this._locate();
        } else if (mode === 'interaction') {
          this.flow.flags.decisions[this.s.chapter] = id;
          this._playThrough(2); this.flow.mode = this._locate();
        } else if (this.s.phase === 'destiny') {
          this.base.finish(id); this.flow.mode = 'ending';
        } else {
          this.flow.flags.replies[this.s.chapter] = id;
          this.base.nextChapter(); this.flow.mode = 'scene'; this.flow.report = this._report();
        }
        return true;
      } catch (_) {
        this.base.restore(before.base); this.flow = before.flow; return false;
      }
    }
    fuse(id) {
      const before = this._before();
      if (!this.base.fuse(id)) return false;
      this._record(before); this._line('神通融合完成，消耗50契砂。');
      return true;
    }
    snapshot() { return copy({ version: 3, base: this.base.snapshot(), flow: this.flow }); }
    _validFlow(flow, s) {
      const finite = (v, min = 0, max = 1e10) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
      const integer = (v, min = 0, max = 1e9) => Number.isInteger(v) && finite(v, min, max);
      if (!flow || !MODES.includes(flow.mode) || !['edge','return'].includes(flow.focus)) return false;
      const f = flow.flags, r = flow.report;
      if (!f || ![null,'defy','rescue'].includes(f.opening) || !Array.isArray(f.decisions) || !Array.isArray(f.replies) || f.decisions.length > 5 || f.replies.length > 5) return false;
      if (f.decisions.some((v, i) => ![null,'bold','bond'].includes(v) || (v !== null && i > s.chapter)) || f.replies.some((v, i) => ![null,'trust','independent'].includes(v) || (v !== null && i > s.chapter))) return false;
      if (!r || r.chapter !== s.chapter || !integer(r.fromLevel, 1, 16) || !integer(r.toLevel, r.fromLevel, 16) || r.toLevel !== s.level || !finite(r.fromAtk, 1) || !finite(r.toAtk, r.fromAtk) || r.toAtk !== s.atk || !integer(r.sand, -100, 1000) || !integer(r.fights, 0, 3) || !Array.isArray(r.lines) || r.lines.length > 300 || r.lines.some(v => typeof v !== 'string' || v.length > 1000)) return false;
      const p = s.phase;
      if (flow.mode === 'opening') return p === 'awakening' && s.chapter === 0;
      if (flow.mode === 'reveal') return p === 'battle' && s.chapter === 0 && s.fight === 1 && f.opening !== null;
      if (flow.mode === 'scene') return p === 'scene' || (p === 'battle' && s.fight < 2);
      if (flow.mode === 'interaction') return p === 'battle' && s.fight === 2;
      if (flow.mode === 'result') return p === 'chapterclear' || p === 'destiny';
      return flow.mode === p && (p === 'ending' || p === 'dead');
    }
    restore(obj) {
      try {
        const o = copy(obj), candidate = new root.TextEngine();
        if (o.version === 3) {
          if (!candidate.restore(o.base) || !this._validFlow(o.flow, candidate.s)) return false;
          this.base = candidate; this.flow = o.flow; return true;
        }
        if (o.version !== 2 || !candidate.restore(o)) return false;
        const migrated = new StoryEngine(o.seed);
        migrated.base = candidate; migrated.flow = migrated._newFlow();
        migrated._settle(); migrated.flow.mode = migrated._locate();
        if (!migrated._validFlow(migrated.flow, migrated.s)) return false;
        this.base = migrated.base; this.flow = migrated.flow; return true;
      } catch (_) { return false; }
    }
  }
  root.StoryEngine = StoryEngine;
})(typeof window !== 'undefined' ? window : globalThis);
