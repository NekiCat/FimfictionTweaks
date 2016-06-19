// ==UserScript==
// @name Fimfiction Tweaks
// @author TigeR
// @version 0.3
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

    // If supported, add a button for speaking the chapter text
    if ('speechSynthesis' in window) {
        var voices;
        var selectedVoice;
        var sentences;
        var currentSentence;
        var stopped = true;

        var $voiceSelect = $('<select style="width: 232px"></select>');
        $voiceSelect.change(function() {
            selectedVoice = voices.filter(function(v) { return v.name == $voiceSelect.val(); })[0];
        });

        var $playButton = $('<li style="border: 0; display: inline-block;"><a href="javascript:void(0);" style="color: #e0ecff; padding: 7px 10px;"><i class="fa fa-play"></i> Play</a></li>');
        var $pauseButton = $('<li style="border: 0; display: inline-block;"><a href="javascript:void(0);" style="color: #e0ecff; padding: 7px 10px;"><i class="fa fa-pause"></i> Pause</a></li>');
        var $stopButton = $('<li style="border: 0; display: inline-block;"><a href="javascript:void(0);" style="color: #e0ecff; padding: 7px 10px;"><i class="fa fa-stop"></i> Stop</a></li>');

        var $controls = $('<div class="dark_toolbar"><ul/></div>');
        $controls.children().append($playButton).append($pauseButton).append($stopButton);

        var $popupContent = $('<div class="std"/>');
        $popupContent.append($('<label/>').append($voiceSelect));
        $popupContent.append($controls);

        var voicePopup = new PopUpMenu('', '<i class="fa fa-volume-up"></i> Voice');
        voicePopup.SetCloseOnHoverOut(false);
        voicePopup.SetCloseOnLinkPressed(false);
        voicePopup.SetSoftClose(true);
        voicePopup.SetWidth('250px');
        voicePopup.SetDimmerEnabled(false);
        voicePopup.SetFixed(true);
        voicePopup.SetContent($popupContent);
        voicePopup.SetFooter('Due to bugs in the speech implementation of Google Chrome, highlighting of the current voice is only available using the native voice.');
        var $voiceButton = $('<li><a href="javascript:void(0);"><i class="fa fa-volume-up"></i> Voice</a></li>');
        $('#chapter_toolbar_container .dark_toolbar div').filter(':last').children('ul').prepend($voiceButton);
        $voiceButton.click(function() {
            voicePopup.Show();
        });

        // Gets called every time a voice changes. The first time this happens, it is a sign that all voices are
        // loaded, and the voices dropdown select is filled.
        speechSynthesis.onvoiceschanged = function() {
            voices = speechSynthesis.getVoices();

            if ($voiceSelect.children().length === 0) {
                selectedVoice = voices[0];
                voices.forEach(function(voice) {
                    $voiceSelect.append($('<option>' + voice.name + '</option>'));
                });
            }
        };

        // Speaks the next sentence in the sentences stack. This is automatically called once
        // the previous sentence finished speaking.
        var speakNextSentence = function() {
            if (!stopped) {
                currentSentence = sentences.pop();
                if (currentSentence) {
                    speechSynthesis.speak(currentSentence);
                }
            }
        };

        // Highlights the currently spoken word. Due to limitations in the TTS implementation,
        // highlighting is only supported using the native voice.
        var selectWordPreviousParagraph;
        var selectWord = function(paragraph, offset) {
            unselectWord(paragraph);
            if (selectWordPreviousParagraph != paragraph) {
                unselectWord(selectWordPreviousParagraph);
                selectWordPreviousParagraph = paragraph;
            }

            var contents = $(paragraph).contents();
            var offsetCounter = 0;

            for (var i = 0; i < contents.length; i++) {
                var text = $(contents[i]).text();
                if (offsetCounter + text.length > offset) {
                    var pos = offset - offsetCounter;

                    var end = text.substring(pos + 1).search(/\s+/);
                    if (end >= 0) end += pos + 1;
                    if (end < 0) end = text.length;

                    var t1 = text.substring(0, pos);
                    var t2 = text.substring(pos, end);
                    var t3 = text.substring(end);

                    var element = contents[i];
                    if (element.nodeType !== 3) element = $(element).contents()[0];
                    $(element).replaceWith(t1 + '<span class="voice-highlight" style="background-color: #7e9340; box-shadow: #97b04d; color: #e5e9d9; padding: 3px; border-radius: 4px;">' + t2 + '</span>' + t3);
                    return;
                } else {
                    offsetCounter += text.length;
                }
            }
        };

        // Deselects all highlighted words and normalizes the paragraph, so that adjacent text nodes are combined.
        var unselectWord = function(paragraph) {
            if (!paragraph) return;
            $(paragraph).find('span.voice-highlight').each(function() {
                $(this).replaceWith($(this).text());
            });
            paragraph.normalize();
        };

        // Begins speaking the chapter contents.
        $playButton.click(function() {
            var textParts = [];
            var $p = $('#chapter_container p').each(function() {
                var text = $(this).text();
                var offset = 0;
                var ps = text.replace(/([\.!?]+\s*)/g, '$1\u0007').split('\u0007').filter(function(s) { return s !== ''; });
                ps.forEach(function(s) {
                    textParts.push({
                        paragraph: this,
                        offset: offset,
                        text: s.replace(/(…|\.\.\.)([^\s])/g, '$1 $2'),
                    });
                    offset += s.length;
                }, this);
            });

            sentences = [];
            textParts.reverse().forEach(function(part) {
                var sentence = part.text;
                if (selectedVoice.name === 'native') {
                    // Chromium is not standards compliant, only the native API supports SSML:
                    // https://bugs.chromium.org/p/chromium/issues/detail?id=88072
                    // https://bugs.chromium.org/p/chromium/issues/detail?id=428902

                    // In future, SSML could be used to emphasise bold or italic words. Note that the offset value in the boundary
                    // event counts the XML tags as well! This could also be a Chromium bug.
                    //sentence = '<?xml version="1.0"?><speak>' + sentence.replace(/\s+/g, ' <mark name="mark"/>') + '</speak>';
                }

                var u = new SpeechSynthesisUtterance(sentence);
                u.voice = selectedVoice;
                u.addEventListener('end', function() {
                    speakNextSentence();
                });
                u.addEventListener('boundary', function(e) {
                    // Chromium is buggy, only the native voice raises boundary events:
                    // https://bugs.chromium.org/p/chromium/issues/detail?id=336769
                    if (e.name === 'word') {
                        selectWord(part.paragraph, part.offset + e.charIndex);
                    }
                });
                sentences.push(u);
            });

            stopped = false;
            speakNextSentence();
        });

        $pauseButton.click(function() {
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                $pauseButton.find('a').html('<i class="fa fa-pause"></i> Pause');
            } else {
                speechSynthesis.pause();
                $pauseButton.find('a').html('<i class="fa fa-play"></i> Resume');
            }
        });

        // Stops the current speaking.
        $stopButton.click(function() {
            speechSynthesis.cancel();
            unselectWord($('#chapter_container')[0]);
            stopped = true;
        });
    }
})();