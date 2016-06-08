// ==UserScript==
// @name Fimfiction Tweaks
// @author TigeR
// @version 0.2
// @description Introduces small tweaks and improvements into fimfiction.net
// @copyright 2016, TigeR
// @license MIT, https://github.com/NekiCat/FimfictionTweaks/blob/master/LICENSE
// @homepageURL https://github.com/NekiCat/FimfictionTweaks
// @match *://*.fimfiction.net/*
// ==/UserScript==

(function() {
    'use strict';

    // For every rating, display the percentage of positive votes
    var $bc = $('.bar_container').css('position', 'relative');
    $bc.prepend(function(i, h) {
        var $like = $bc.eq(i).find('.bar_like');
        if ($like.length) {
            return $('<div style="position: absolute; width: 100%; text-align: center; line-height: 14px; color: white; text-shadow: none; font-size: 0.75em;">' + Math.round($like[0].style.width.slice(0, -1) * 10) / 10 + '%</div>');
        }
    });

    // If chapters are hidden, show all chapter blocks that only contain a single chapter
    var $ce = $('.chapter_expander');
    $ce.each(function(i) {
        var t = $(this).children('li').text().trim();
        t = t.substr(0, t.indexOf(' '));
        if (t == '1') {
            $(this).nextAll('.chapter_container_hidden').removeClass('chapter_container_hidden');
            $(this).remove();
        }
    });
})();