/* おさんぽびより LP — ページで使う小さなスクリプト。
   どれも「無くても読める」補助で、JSが動かなくてもページは成立する。
   1. 紹介動画: ポスターの再生ボタンを押したら本体のコントロールに切り替える
   2. 機能紹介のカルーセル: 現在位置の点・中央以外を薄くする印・マウスで掴んで送る操作を足す
      (送る動作そのものはCSSの scroll-snap。JSが無くても指やトラックパッドで送れる)
   3. 英語トップの気温: ブラウザが en-US のときだけ華氏を大きく出す */
(function () {
  "use strict";

  // --- 1. 紹介動画 -------------------------------------------------------
  var frame = document.getElementById("lp-video");
  if (frame) {
    var video = frame.querySelector("video");
    var play = frame.querySelector(".video__play");
    play.addEventListener("click", function () {
      frame.classList.add("is-playing");
      video.controls = true;
      video.play();
    });
    video.addEventListener("ended", function () {
      frame.classList.remove("is-playing");
      video.controls = false;
    });
  }

  // --- 2. カルーセル -----------------------------------------------------
  // 点は装飾でなく「あと何枚あるか」を伝えるためのもの。押すとその枚目へ送る
  var carousels = document.querySelectorAll("[data-carousel]");
  Array.prototype.forEach.call(carousels, function (root) {
    var track = root.querySelector(".shots");
    var items = track ? track.querySelectorAll(".shots__item") : [];
    if (items.length < 2) return;

    var dots = document.createElement("div");
    dots.className = "shots__dots";
    var buttons = [];
    Array.prototype.forEach.call(items, function (item, i) {
      var caption = item.querySelector("figcaption");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "shots__dot";
      // 読み上げ用の名前。言語によらず通じる「説明 (2/3)」の形にする(4言語のページで共用するため)
      b.setAttribute("aria-label", (caption ? caption.textContent.trim() + " " : "") + "(" + (i + 1) + "/" + items.length + ")");
      b.addEventListener("click", function () {
        item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
      dots.appendChild(b);
      buttons.push(b);
    });
    root.appendChild(dots);

    // 枠の中央にいちばん近い1枚を「いま見えている枚目」とする。
    // CSS はそれ以外を半透明にして「次の絵がうっすら見える」状態を作り、点も同じ値で更新する。
    // scroll のたびに計算すると重いので、止まってから少し待って1回だけ計算する
    function nearestItem() {
      // offsetLeft は offsetParent 基準で、枠(.shots)は position を持たないので使えない。
      // 画面上の矩形どうしで中央の距離を測る
      var frame = track.getBoundingClientRect();
      var center = frame.left + frame.width / 2;
      var nearest = items[0], best = Infinity;
      Array.prototype.forEach.call(items, function (it) {
        var r = it.getBoundingClientRect();
        var d = Math.abs(r.left + r.width / 2 - center);
        if (d < best) { best = d; nearest = it; }
      });
      return nearest;
    }
    function markActive() {
      var current = nearestItem();
      Array.prototype.forEach.call(items, function (it, j) {
        var on = it === current;
        it.classList.toggle("is-active", on);
        buttons[j].setAttribute("aria-current", on ? "true" : "false");
      });
    }
    var timer = null;
    track.addEventListener("scroll", function () {
      clearTimeout(timer);
      timer = setTimeout(markActive, 80);
    }, { passive: true });
    markActive();

    // マウスでも掴んで送れるようにする(指とトラックパッドは素の scroll-snap で動く)。
    // 掴んでいる間は snap を切って指に追従させ、離したら一番近い1枚へ寄せる。
    // 数px しか動かなかったときはクリック扱いにして何もしない
    var drag = null;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
      track.classList.add("is-grabbing");
      track.classList.add("is-settling");
      try { track.setPointerCapture(e.pointerId); } catch (_) { /* 合成イベントなど、捕まえられないときは追従だけ */ }
    });
    track.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      track.scrollLeft = drag.left - dx;
    });
    function release() {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      track.classList.remove("is-grabbing");
      if (!moved) { track.classList.remove("is-settling"); return; }
      // 枠の中央にいちばん近い1枚へ寄せる。snap(is-settling で切ったまま)は寄せ終わってから戻す —
      // 先に戻すと Chrome が「最後に止まっていた1枚」へ引き戻してしまい、掴んで送った意味がなくなる
      nearestItem().scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setTimeout(function () { track.classList.remove("is-settling"); markActive(); }, 500);
    }
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
  });

  // --- 3. 英語トップの気温(℃ ⇄ ℉) -------------------------------------
  // HTMLの既定は摂氏(華氏を日常的に使うのは米国とごく一部だけ)。
  // JSが動かなくても摂氏と華氏の両方が読めるよう、入れ替えるだけで消さない
  if (/^en-US$/i.test(navigator.language || "")) {
    Array.prototype.forEach.call(document.querySelectorAll(".compare__value[data-f]"), function (el) { el.textContent = el.dataset.f; });
    Array.prototype.forEach.call(document.querySelectorAll(".compare__alt[data-c]"), function (el) { el.textContent = el.dataset.c; });
  }
})();
