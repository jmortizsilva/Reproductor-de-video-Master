/* =============================================================================
 ======================== CUSTOM SCRIPT FOR ABLE PLAYER ========================
 ============================================================================ */

/* Aquest script reescriu les funcions del codi original ableplayer.js */

/* ═══════════════════════════════════════════════════════════════════════════
   MOSTRAR LA VELOCITAT DE REPRODUCCIÓ EN FER UN ZOOM DE 400% 
══════════════════════════════════════════════════════════════════════════════ */
/* 
   Modificació del valor de statusBarWidthBreakpoint = 300 --> statusBarWidthBreakpoint = 100, per tal d'evitar 
   un display: none del text "Velocitat: 1x" en fer un zoom 400 % */
(function ($) {
    AblePlayer.prototype.refreshControls = function (context, duration, elapsed) {

        // context is one of the following:
        // 'init' - initial build (or subsequent change that requires full rebuild)
        // 'timeline' - a change may effect time-related controls
        // 'captions' - a change may effect caption-related controls
        // 'descriptions' - a change may effect description-related controls
        // 'transcript' - a change may effect the transcript window or button
        // 'fullscreen' - a change has been triggered by full screen toggle
        // 'playpause' - a change triggered by either a 'play' or 'pause' event

        // NOTE: context is not currently supported.
        // The steps in this function have too many complex interdependencies
        // The gains in efficiency are offset by the possibility of introducing bugs
        // For now, executing everything
        context = 'init';

        // duration and elapsed are passed from callback functions of Vimeo API events
        // duration is expressed as sss.xxx
        // elapsed is expressed as sss.xxx

        var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
            updateLive, textByState, timestamp, widthUsed,
            leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
            buffered, newTop, statusBarHeight, speedHeight, statusBarWidthBreakpoint,
            newSvgData;

        thisObj = this;
        if (this.swappingSrc) {
            if (this.playing) {
                // wait until new source has loaded before refreshing controls
                // can't wait if player is NOT playing because some critical events
                // won't fire until playback of new media starts
                return;
            }
        }

        if (context === 'timeline' || context === 'init') {
            // all timeline-related functionality requires both duration and elapsed
            if (typeof this.duration === 'undefined') {
                // wait until duration is known before proceeding with refresh
                return;
            }
            if (this.useChapterTimes) {
                this.chapterDuration = this.getChapterDuration();
                this.chapterElapsed = this.getChapterElapsed();
            }

            if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && this.duration > 0) {
                // couldn't calculate seekInterval previously; try again.
                this.setSeekInterval();
            }

            if (this.seekBar) {
                if (this.useChapterTimes) {
                    lastChapterIndex = this.selectedChapters.cues.length - 1;
                    if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
                        // this is the last chapter
                        if (this.currentChapter.end !== this.duration) {
                            // chapter ends before or after video ends
                            // need to adjust seekbar duration to match video end
                            this.seekBar.setDuration(this.duration - this.currentChapter.start);
                        }
                        else {
                            this.seekBar.setDuration(this.chapterDuration);
                        }
                    }
                    else {
                        // this is not the last chapter
                        this.seekBar.setDuration(this.chapterDuration);
                    }
                }
                else {
                    if (!(this.duration === undefined || isNaN(this.duration) || this.duration === -1)) {
                        this.seekBar.setDuration(this.duration);
                    }
                }
                if (!(this.seekBar.tracking)) {
                    // Only update the aria live region if we have an update pending
                    // (from a seek button control) or if the seekBar has focus.
                    // We use document.activeElement instead of $(':focus') due to a strange bug:
                    // 	When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
                    updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
                    this.liveUpdatePending = false;
                    if (this.useChapterTimes) {
                        this.seekBar.setPosition(this.chapterElapsed, updateLive);
                    }
                    else {
                        this.seekBar.setPosition(this.elapsed, updateLive);
                    }
                }

                // When seeking, display the seek bar time instead of the actual elapsed time.
                if (this.seekBar.tracking) {
                    displayElapsed = this.seekBar.lastTrackPosition;
                }
                else {
                    if (this.useChapterTimes) {
                        displayElapsed = this.chapterElapsed;
                    }
                    else {
                        displayElapsed = this.elapsed;
                    }
                }
            }
            // update elapsed & duration
            if (typeof this.$durationContainer !== 'undefined') {
                if (this.useChapterTimes) {
                    this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
                }
                else {
                    this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.duration));
                }
            }
            if (typeof this.$elapsedTimeContainer !== 'undefined') {
                this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
            }

            if (this.skin === 'legacy') {
                // Update seekbar width.
                // To do this, we need to calculate the width of all buttons surrounding it.
                if (this.seekBar) {
                    widthUsed = 0;
                    leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
                    rightControls = leftControls.next('div.able-right-controls');
                    leftControls.children().each(function () {
                        if ($(this).attr('role') == 'button') {
                            widthUsed += $(this).outerWidth(true); // true = include margin
                        }
                    });
                    rightControls.children().each(function () {
                        if ($(this).attr('role') == 'button') {
                            widthUsed += $(this).outerWidth(true);
                        }
                    });
                    if (this.fullscreen) {
                        seekbarWidth = $(window).width() - widthUsed;
                    }
                    else {
                        // seekbar is wide enough to fill the remaining space
                        // include a 5px buffer to account for minor browser differences  
                        seekbarWidth = this.$ableWrapper.width() - widthUsed - 5;
                    }
                    // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
                    if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
                        this.seekBar.setWidth(seekbarWidth);
                    }
                }
            }

            // Update buffering progress.
            // TODO: Currently only using the first HTML5 buffered interval,
            // but this fails sometimes when buffering is split into two or more intervals.
            if (this.player === 'html5') {
                if (this.media.buffered.length > 0) {
                    buffered = this.media.buffered.end(0);
                    if (this.useChapterTimes) {
                        if (buffered > this.chapterDuration) {
                            buffered = this.chapterDuration;
                        }
                        if (this.seekBar) {
                            this.seekBar.setBuffered(buffered / this.chapterDuration);
                        }
                    }
                    else {
                        if (this.seekBar) {
                            if (!isNaN(buffered)) {
                                this.seekBar.setBuffered(buffered / duration);
                            }
                        }
                    }
                }
            }
            else if (this.player === 'youtube') {
                if (this.seekBar) {
                    if (this.youTubePlayerReady) {
                        this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
                    }
                }
            }
            else if (this.player === 'vimeo') {
                // TODO: Add support for Vimeo buffering update
            }
        } // end if context == 'timeline' or 'init'

        if (context === 'descriptions' || context == 'init') {

            if (this.$descButton) {
                if (this.descOn) {
                    this.$descButton.removeClass('buttonOff').attr('aria-label', this.tt.turnOffDescriptions);
                    this.$descButton.find('span.able-clipped').text(this.tt.turnOffDescriptions);
                }
                else {
                    this.$descButton.addClass('buttonOff').attr('aria-label', this.tt.turnOnDescriptions);
                    this.$descButton.find('span.able-clipped').text(this.tt.turnOnDescriptions);
                }
            }
        }

        if (context === 'captions' || context == 'init') {

            if (this.$ccButton) {

                captionsCount = this.captions.length;

                // Button has a different title depending on the number of captions.
                // If only one caption track, this is "Show captions" and "Hide captions"
                // Otherwise, it is just always "Captions"
                if (!this.captionsOn) {
                    this.$ccButton.addClass('buttonOff');
                    this.$ccButton.attr('aria-pressed', 'false')
                    if (captionsCount === 1) {
                        this.$ccButton.attr('aria-label', this.tt.showCaptions);
                        this.$ccButton.find('span.able-clipped').text(this.tt.showCaptions);
                    }
                }
                else {
                    this.$ccButton.removeClass('buttonOff');
                    this.$ccButton.attr('aria-pressed', 'true')
                    if (captionsCount === 1) {
                        this.$ccButton.attr('aria-label', this.tt.hideCaptions);
                        this.$ccButton.find('span.able-clipped').text(this.tt.hideCaptions);
                    }
                }

                if (captionsCount > 1) {
                    this.$ccButton.attr({
                        'aria-label': this.tt.captions,
                        'aria-haspopup': 'true',
                        'aria-controls': this.mediaId + '-captions-menu'
                    });
                    this.$ccButton.find('span.able-clipped').text(this.tt.captions);
                }
            }
        }

        if (context === 'fullscreen' || context == 'init') {
            if (this.$fullscreenButton) {
                if (!this.fullscreen) {
                    this.$fullscreenButton.attr('aria-label', this.tt.enterFullscreen);
                    if (this.iconType === 'font') {
                        this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
                        this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullscreen);
                    }
                    else if (this.iconType === 'svg') {
                        newSvgData = this.getSvgData('fullscreen-expand');
                        this.$fullscreenButton.find('svg').attr('viewBox', newSvgData[0]);
                        this.$fullscreenButton.find('path').attr('d', newSvgData[1]);
                        this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullscreen);
                    }
                    else {
                        this.$fullscreenButton.find('img').attr('src', this.fullscreenExpandButtonImg);
                    }
                }
                else {
                    this.$fullscreenButton.attr('aria-label', this.tt.exitFullscreen);
                    if (this.iconType === 'font') {
                        this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-expand').addClass('icon-fullscreen-collapse');
                        this.$fullscreenButton.find('span.able-clipped').text(this.tt.exitFullscreen);
                    }
                    else if (this.iconType === 'svg') {
                        newSvgData = this.getSvgData('fullscreen-collapse');
                        this.$fullscreenButton.find('svg').attr('viewBox', newSvgData[0]);
                        this.$fullscreenButton.find('path').attr('d', newSvgData[1]);
                        this.$fullscreenButton.find('span.able-clipped').text(this.tt.exitFullscreen);
                    }
                    else {
                        this.$fullscreenButton.find('img').attr('src', this.fullscreenCollapseButtonImg);
                    }
                }
            }
        }
        if (context === 'playpause' || context == 'init') {
            if (typeof this.$bigPlayButton !== 'undefined' && typeof this.seekBar !== 'undefined') {
                // Choose show/hide for big play button and adjust position.
                if (this.paused && !this.seekBar.tracking) {
                    if (!this.hideBigPlayButton) {
                        this.$bigPlayButton.show();
                        this.$bigPlayButton.attr('aria-hidden', 'false');

                    }
                    if (this.fullscreen) {
                        this.$bigPlayButton.width($(window).width());
                        this.$bigPlayButton.height($(window).height());
                    }
                    else {
                        this.$bigPlayButton.width(this.$mediaContainer.width());
                        this.$bigPlayButton.height(this.$mediaContainer.height());
                    }
                }
                else {
                    this.$bigPlayButton.hide();
                    this.$bigPlayButton.attr('aria-hidden', 'true');
                }
            }
        }

        if (context === 'transcript' || context == 'init') {

            if (this.transcriptType) {
                // Sync checkbox and autoScrollTranscript with user preference
                if (this.prefAutoScrollTranscript === 1) {
                    this.autoScrollTranscript = true;
                    this.$autoScrollTranscriptCheckbox.prop('checked', true);
                }
                else {
                    this.autoScrollTranscript = false;
                    this.$autoScrollTranscriptCheckbox.prop('checked', false);
                }

                // If transcript locked, scroll transcript to current highlight location.
                if (this.autoScrollTranscript && this.currentHighlight) {
                    newTop = Math.floor(this.$transcriptDiv.scrollTop() +
                        $(this.currentHighlight).position().top -
                        (this.$transcriptDiv.height() / 2) +
                        ($(this.currentHighlight).height() / 2));
                    if (newTop !== Math.floor(this.$transcriptDiv.scrollTop())) {
                        // Set a flag to ignore the coming scroll event.
                        // there's no other way I know of to differentiate programmatic and user-initiated scroll events.
                        this.scrollingTranscript = true;
                        // only scroll once after moving a highlight
                        if (this.movingHighlight) {
                            this.$transcriptDiv.scrollTop(newTop);
                            this.movingHighlight = false;
                        }
                    }
                }
            }
        }

        if (context === 'init') {

            if (this.$chaptersButton) {
                this.$chaptersButton.attr({
                    'aria-label': this.tt.chapters,
                    'aria-haspopup': 'true',
                    'aria-controls': this.mediaId + '-chapters-menu'
                });
            }
        }

        if (context === 'timeline' || context === 'playpause' || context === 'init') {

            // update status
            textByState = {
                'stopped': this.tt.statusStopped,
                'paused': this.tt.statusPaused,
                'playing': this.tt.statusPlaying,
                'buffering': this.tt.statusBuffering,
                'ended': this.tt.statusEnd
            };

            if (this.stoppingYouTube) {
                // stoppingYouTube is true temporarily while video is paused and seeking to 0
                // See notes in handleRestart()
                // this.stoppingYouTube will be reset when seek to 0 is finished (in event.js > onMediaUpdateTime())
                if (this.$status.text() !== this.tt.statusStopped) {
                    this.$status.text(this.tt.statusStopped);
                }
                if (this.$playpauseButton.find('span').first().hasClass('icon-pause')) {
                    if (this.iconType === 'font') {
                        this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
                        this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
                    }
                    else if (this.iconType === 'svg') {
                        newSvgData = this.getSvgData('play');
                        this.$playpauseButton.find('svg').attr('viewBox', newSvgData[0]);
                        this.$playpauseButton.find('path').attr('d', newSvgData[1]);
                        this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
                    }
                    else {
                        this.$playpauseButton.find('img').attr('src', this.playButtonImg);
                    }
                }
            }
            else {
                if (typeof this.$status !== 'undefined' && typeof this.seekBar !== 'undefined') {
                    // Update the text only if it's changed since it has role="alert";
                    // also don't update while tracking, since this may Pause/Play the player but we don't want to send a Pause/Play update.
                    this.getPlayerState().then(function (currentState) {
                        if (thisObj.$status.text() !== textByState[currentState] && !thisObj.seekBar.tracking) {
                            // Debounce updates; only update after status has stayed steadily different for a while
                            // "A while" is defined differently depending on context
                            if (thisObj.swappingSrc) {
                                // this is where most of the chatter occurs (e.g., playing, paused, buffering, playing),
                                // so set a longer wait time before writing a status message
                                if (!thisObj.debouncingStatus) {
                                    thisObj.statusMessageThreshold = 2000; // in ms (2 seconds)
                                }
                            }
                            else {
                                // for all other contexts (e.g., users clicks Play/Pause)
                                // user should receive more rapid feedback
                                if (!thisObj.debouncingStatus) {
                                    thisObj.statusMessageThreshold = 250; // in ms
                                }
                            }
                            timestamp = (new Date()).getTime();
                            if (!thisObj.statusDebounceStart) {
                                thisObj.statusDebounceStart = timestamp;
                                // Call refreshControls() again after allotted time has passed
                                thisObj.debouncingStatus = true;
                                thisObj.statusTimeout = setTimeout(function () {
                                    thisObj.debouncingStatus = false;
                                    thisObj.refreshControls(context);
                                }, thisObj.statusMessageThreshold);
                            }
                            else if ((timestamp - thisObj.statusDebounceStart) > thisObj.statusMessageThreshold) {
                                thisObj.$status.text(textByState[currentState]);
                                thisObj.statusDebounceStart = null;
                                clearTimeout(thisObj.statusTimeout);
                                thisObj.statusTimeout = null;
                            }
                        }
                        else {
                            thisObj.statusDebounceStart = null;
                            thisObj.debouncingStatus = false;
                            clearTimeout(thisObj.statusTimeout);
                            thisObj.statusTimeout = null;
                        }
                        // Don't change play/pause button display while using the seek bar (or if YouTube stopped)
                        if (!thisObj.seekBar.tracking && !thisObj.stoppingYouTube) {
                            if (currentState === 'paused' || currentState === 'stopped' || currentState === 'ended') {
                                thisObj.$playpauseButton.attr('aria-label', thisObj.tt.play);

                                if (thisObj.iconType === 'font') {
                                    thisObj.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
                                    thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.play);
                                }
                                else if (thisObj.iconType === 'svg') {
                                    newSvgData = thisObj.getSvgData('play');
                                    thisObj.$playpauseButton.find('svg').attr('viewBox', newSvgData[0]);
                                    thisObj.$playpauseButton.find('path').attr('d', newSvgData[1]);
                                    thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.play);
                                }
                                else {
                                    thisObj.$playpauseButton.find('img').attr('src', thisObj.playButtonImg);
                                }
                            }
                            else {
                                thisObj.$playpauseButton.attr('aria-label', thisObj.tt.pause);

                                if (thisObj.iconType === 'font') {
                                    thisObj.$playpauseButton.find('span').first().removeClass('icon-play').addClass('icon-pause');
                                    thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.pause);
                                }
                                else if (thisObj.iconType === 'svg') {
                                    newSvgData = thisObj.getSvgData('pause');
                                    thisObj.$playpauseButton.find('svg').attr('viewBox', newSvgData[0]);
                                    thisObj.$playpauseButton.find('path').attr('d', newSvgData[1]);
                                    thisObj.$playpauseButton.find('span.able-clipped').text(thisObj.tt.pause);
                                }
                                else {
                                    thisObj.$playpauseButton.find('img').attr('src', thisObj.pauseButtonImg);
                                }
                            }
                        }
                    });
                }
            }
        }

        // Show/hide status bar content conditionally
        if (!this.fullscreen) {
            statusBarWidthBreakpoint = 100;
            statusBarHeight = this.$statusBarDiv.height();
            speedHeight = this.$statusBarDiv.find('span.able-speed').height();
            if (speedHeight > (statusBarHeight + 5)) {
                // speed bar is wrapping (happens often in German player)
                this.$statusBarDiv.find('span.able-speed').hide();
                this.hidingSpeed = true;
            }
            else {
                if (this.hidingSpeed) {
                    this.$statusBarDiv.find('span.able-speed').show();
                    this.hidingSpeed = false;
                }
                if (this.$statusBarDiv.width() < statusBarWidthBreakpoint) {
                    // Player is too small for a speed span
                    this.$statusBarDiv.find('span.able-speed').hide();
                    this.hidingSpeed = true;
                }
                else {
                    if (this.hidingSpeed) {
                        this.$statusBarDiv.find('span.able-speed').show();
                        this.hidingSpeed = false;
                    }
                }
            }
        }

    };
})(jQuery);

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Eliminar role='dialog' si l'àrea de transcripció està dins de #transcript (transcripció fixa)
═════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
    var originalInjectTranscriptArea = AblePlayer.prototype.injectTranscriptArea;
    AblePlayer.prototype.injectTranscriptArea = function () {
        originalInjectTranscriptArea.apply(this, arguments);
        if (this.$transcriptArea.closest('#transcript').length) {
            this.$transcriptArea.removeAttr('role');
        }
    };
})();

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Eliminar this.refreshControls('timeline'); per tal que el lector de pantalla només llegeixi 
   el temps final després de retrocedir o avançar amb els botons << / >>
═════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
    // Overwrite seekTo function
    AblePlayer.prototype.seekTo = function (newTime) {
        var thisObj = this;

        // define variables to be used for analytics
        // e.g., to measure the extent to which users seek back and forward
        this.seekFromTime = this.media.currentTime;
        this.seekToTime = newTime;

        this.seeking = true;
        this.liveUpdatePending = true;

        if (this.speakingDescription) {
            this.synth.cancel();
        }

        if (this.player === 'html5') {
            var seekable;

            this.startTime = newTime;
            // Check HTML5 media "seekable" property to be sure media is seekable to startTime
            seekable = this.media.seekable;
            if (seekable.length > 0 && this.startTime >= seekable.start(0) && this.startTime <= seekable.end(0)) {
                // ok to seek to startTime
                // canplaythrough will be triggered when seeking is complete
                // this.seeking will be set to false at that point
                this.media.currentTime = this.startTime;
                this.seekStatus = 'complete';
                if (this.hasSignLanguage && this.signVideo) {
                    // keep sign language video in sync
                    this.signVideo.currentTime = this.startTime;
                }
            }
        }
        else if (this.player === 'youtube') {
            this.youTubePlayer.seekTo(newTime, true);
            if (newTime > 0) {
                if (typeof this.$posterImg !== 'undefined') {
                    this.$posterImg.hide();
                }
            }
        }
        else if (this.player === 'vimeo') {
            this.vimeoPlayer.setCurrentTime(newTime).then(function () {
                // seek finished.
                // successful completion also fires a 'seeked' event (see event.js)
                thisObj.elapsed = newTime;
                thisObj.refreshControls('timeline');
            });
        }
    };
})();

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   TRADUCCIÓ DE TEXTOS ACCESSIBLESLIDER (HORES, MINUTS, SEGONS)
═════════════════════════════════════════════════════════════════════════════════════════════════ */
(function ($) {
    // Guarda una referència al constructor original
    var OldAccessibleSlider = window.AccessibleSlider;

    // Defineix el nou constructor que accepta un paràmetre extra 'tt'
    function CustomAccessibleSlider(mediaType, div, orientation, length, min, max, bigInterval, label, className, trackingMedia, initialState, tt) {
        // Crida al constructor original
        OldAccessibleSlider.call(this, mediaType, div, orientation, length, min, max, bigInterval, label, className, trackingMedia, initialState);
        // Afegeix la taula de traduccions
        this.tt = tt;
    }

    // Estableix la cadena de prototipus
    CustomAccessibleSlider.prototype = Object.create(OldAccessibleSlider.prototype);
    CustomAccessibleSlider.prototype.constructor = CustomAccessibleSlider;

    // Reemplaça el constructor original per aquest nou
    window.AccessibleSlider = CustomAccessibleSlider;

    // ========= Sobrescriptura d’addControls =========
    // Guarda la funció original
    var oldAddControls = AblePlayer.prototype.addControls;
    AblePlayer.prototype.addControls = function () {
        // Crida la funció original
        oldAddControls.apply(this, arguments);

        // Si el skin és '2020' i s'ha creat la seekBar, assigna-li la taula de traduccions
        if (this.skin === '2020' && this.seekBar) {
            this.seekBar.tt = this.tt;
        }
    };

    // ========= Sobrescriptura d’updateAriaValues =========
    // Aquest mètode és utilitzat per construir el text accessible (p. ex. "1 hour, 3 minutes, 5 seconds")
    // Ara s’utilitza la taula de traduccions 'tt' (si no s'ha definit, s'utilitzen valors per defecte)
    var oldUpdateAriaValues = AccessibleSlider.prototype.updateAriaValues;
    AccessibleSlider.prototype.updateAriaValues = function (position, updateLive) {
        // Utilitza this.tt si existeix, o crea un objecte per defecte
        var tt = this.tt || {
            hour: 'hour',
            hours: 'hours',
            minute: 'minute',
            minutes: 'minutes',
            second: 'second',
            seconds: 'seconds'
        };

        var pHours = Math.floor(position / 3600);
        var pMinutes = Math.floor((position % 3600) / 60);
        var pSeconds = Math.floor(position % 60);

        var pHourWord = pHours === 1 ? tt.hour : tt.hours;
        var pMinuteWord = pMinutes === 1 ? tt.minute : tt.minutes;
        var pSecondWord = pSeconds === 1 ? tt.second : tt.seconds;

        var descriptionText;
        if (pHours > 0) {
            descriptionText = pHours + ' ' + pHourWord + ', ' + pMinutes + ' ' + pMinuteWord + ', ' + pSeconds + ' ' + pSecondWord;
        } else if (pMinutes > 0) {
            descriptionText = pMinutes + ' ' + pMinuteWord + ', ' + pSeconds + ' ' + pSecondWord;
        } else {
            descriptionText = pSeconds + ' ' + pSecondWord;
        }

        // Actualitza la regió live (per a usuaris de lectors de pantalla)
        if (!this.liveAriaRegion) {
            this.liveAriaRegion = $('<span>', {
                'class': 'able-offscreen',
                'aria-live': 'polite'
            });
            this.wrapperDiv.append(this.liveAriaRegion);
        }
        if (updateLive && (this.liveAriaRegion.text() !== descriptionText)) {
            this.liveAriaRegion.text(descriptionText);
        }

        // Actualitza els atributs ARIA del seekHead
        this.seekHead.attr('aria-valuetext', descriptionText);
        this.seekHead.attr('aria-valuenow', Math.floor(position).toString());
    };

})(jQuery);

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════
   ACTUALITZAR ATRIBUTS PER TAL QUE EL LECTOR DE PANTALLA LLEGEIXI ELS SUBTÍTOLS I TAMBÉ HI VAGI EL FOCUS
═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function ($) {
    AblePlayer.prototype.setupCaptions = function (track, cues) {

        // Setup player for display of captions (one track at a time)
        var thisObj, captions, inserted, i, capLabel;

        // Insert track into captions array 
        // in its proper alphabetical sequence by label  
        if (typeof cues === 'undefined') {
            cues = null;
        }

        if (this.usingYouTubeCaptions || this.usingVimeoCaptions) {
            // this.captions has already been populated 
            // For YouTube, this happens in youtube.js > getYouTubeCaptionTracks()
            // For Vimeo, this happens in vimeo.js > getVimeoCaptionTracks() 
            // So, nothing to do here... 
        }
        else {

            if (this.captions.length === 0) { // this is the first	
                this.captions.push({
                    'language': track.language,
                    'label': track.label,
                    'def': track.def,
                    'cues': cues
                });
            }
            else { // there are already captions in the array			
                inserted = false;
                for (i = 0; i < this.captions.length; i++) {
                    capLabel = track.label;
                    if (capLabel.toLowerCase() < this.captions[i].label.toLowerCase()) {
                        // insert before track i
                        this.captions.splice(i, 0, {
                            'language': track.language,
                            'label': track.label,
                            'def': track.def,
                            'cues': cues
                        });
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    // just add track to the end
                    this.captions.push({
                        'language': track.language,
                        'label': track.label,
                        'def': track.def,
                        'cues': cues
                    });
                }
            }
        }

        // there are captions available 
        this.hasCaptions = true;
        this.currentCaption = -1;
        if (this.prefCaptions === 1) {
            this.captionsOn = true;
        } else if (this.prefCaptions === 0) {
            this.captionsOn = false;
        } else {
            // user has no prefs. Use default state.
            if (this.defaultStateCaptions === 1) {
                this.captionsOn = true;
            } else {
                this.captionsOn = false;
            }
        }
        if (this.mediaType === 'audio' && this.captionsOn) {
            this.$captionsContainer.removeClass('captions-off');
        }

        if (!this.$captionsWrapper ||
            (this.$captionsWrapper && !($.contains(this.$ableDiv[0], this.$captionsWrapper[0])))) {
            // captionsWrapper either doesn't exist, or exists in an orphaned state 
            // Either way, it needs to be rebuilt...  
            this.$captionsDiv = $('<div>', {
                'class': 'able-captions',
                'tabindex': 0,          // ◀◀◀◀◀◀
                'lang': track.language  // ◀◀◀◀◀◀
            });
            this.$captionsWrapper = $('<div>', {
                'class': 'able-captions-wrapper',
                'aria-hidden': 'false',  // ◀◀◀◀◀◀
                'aria-live': 'polite',   // ◀◀◀◀◀◀
                'aria-atomic': 'true',   // ◀◀◀◀◀◀
                'lang': track.language   // ◀◀◀◀◀◀
            }).hide();
            if (this.prefCaptionsPosition === 'below') {
                this.$captionsWrapper.addClass('able-captions-below');
            } else {
                this.$captionsWrapper.addClass('able-captions-overlay');
            }
            this.$captionsWrapper.append(this.$captionsDiv);
            this.$captionsContainer.append(this.$captionsWrapper);
        }
    };

})(jQuery);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   ACTUALITZA L'ATRIBUT LANG SEGONS L'IDIOMA SELECCIONAT A TOT EL CONTENIDOR DEL CAPTIONS I AL DIV DEL CAPTIONS
══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function ($) {
    AblePlayer.prototype.showCaptions = function (now) {

        var c, thisCaption, captionText;
        var cues;
        if (this.selectedCaptions.cues.length) {
            cues = this.selectedCaptions.cues;
        }
        else if (this.captions.length >= 1) {
            cues = this.captions[0].cues;
        }
        else {
            cues = [];
        }
        for (c = 0; c < cues.length; c++) {
            if ((cues[c].start <= now) && (cues[c].end > now)) {
                thisCaption = c;
                break;
            }
        }
        if (typeof thisCaption !== 'undefined') {
            if (this.currentCaption !== thisCaption) {
                // it's time to load the new caption into the container div
                captionText = this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>');
                this.$captionsDiv.html(captionText);

                // Actualitza l'atribut lang segons l'idioma seleccionat al div del captions ◀◀◀◀◀◀
                if (this.selectedCaptions && this.selectedCaptions.language) {
                    this.$captionsDiv.attr('lang', this.selectedCaptions.language);
                }
                // Actualitza l'atribut lang segons l'idioma seleccionat a tot el contenidor del captions ◀◀◀◀◀◀
                if (this.selectedCaptions && this.selectedCaptions.language) {
                    this.$captionsWrapper.attr('lang', this.selectedCaptions.language);
                }

                this.currentCaption = thisCaption;
                if (captionText.length === 0) {
                    // hide captionsDiv; otherwise background-color is visible due to padding
                    this.$captionsDiv.css('display', 'none');
                }
                else {
                    this.$captionsDiv.css('display', 'inline-block');
                }
            }
        }
        else {
            this.$captionsDiv.html('').css('display', 'none');
            this.currentCaption = -1;
        }
    };

})(jQuery);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   ENLLAÇAR LA TRADUCCIÓ DE L'IDIOMA ARANÈS (oc-aranes)
══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function ($) {

    AblePlayer.prototype.getSupportedLangs = function () {
        // returns an array of languages for which AblePlayer has translation tables
        var langs = ['ca', 'cs', 'da', 'de', 'en', 'es', 'fr', 'he', 'id', 'it', 'ja', 'nb', 'nl', 'oc-aranes', 'pt', 'pt-br', 'sv', 'tr', 'zh-tw'];
        return langs;
    };


})(jQuery);

(function ($) {

    var isoLangs = {
        "oc-aranes": {
            "name": "Aranese",
            "nativeName": "Aranés"
        },
    }

})(jQuery);

/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    Solució al problema que no apareixen els controls d'AblePlayer en vídeos de YouTube sense subtítols
══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

(function ($) {
    // Només afegir un timeout a la promesa de getYouTubeCaptionTracks sense modificar res més
    var originalGetYouTubeCaptionTracks = AblePlayer.prototype.getYouTubeCaptionTracks;

    if (originalGetYouTubeCaptionTracks) {
        AblePlayer.prototype.getYouTubeCaptionTracks = function () {
            var thisObj = this;
            var originalPromise = originalGetYouTubeCaptionTracks.call(this);
            var deferred = new $.Deferred();
            var timeoutId;
            var resolved = false;

            timeoutId = setTimeout(function () {
                if (!resolved) {
                    resolved = true;

                    // Marcar que aquest vídeo no té subtítols
                    thisObj.needsInitialPause = true;

                    // Forçar pausa immediata si el vídeo ja està llest
                    if (thisObj.youTubePlayer) {
                        thisObj.youTubePlayer.pauseVideo();
                        thisObj.youTubePlayer.stopVideo();
                    }

                    deferred.resolve();
                }
            }, 350);

            originalPromise.always(function () {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    deferred.resolve();
                }
            });
            return deferred.promise();
        };
    }

    // Interceptar onMediaReady per prevenir reproducció automàtica
    var originalOnMediaReady = AblePlayer.prototype.onMediaReady;

    if (originalOnMediaReady) {
        AblePlayer.prototype.onMediaReady = function () {
            // Si el vídeo no té subtítols, forçar pausa
            if (this.needsInitialPause) {

                // Parar el vídeo de totes les maneres possibles
                if (this.youTubePlayer) {
                    this.youTubePlayer.pauseVideo();
                    this.youTubePlayer.stopVideo();
                }
                if (this.media) {
                    this.media.pause();
                }

                // Forçar els estats interns
                this.playing = false;
                this.paused = true;

                // Retornar sense cridar el mètode original
                return;
            }

            // Si té subtítols, comportament normal
            return originalOnMediaReady.apply(this, arguments);
        };
    }

})(jQuery);

/* ═══════════════════════════════════════════════════════════════════════════
   SLIDER VOLUM - COLOR DINÀMIC / ÀREA CANCEL·LACIÓ DEL CURSOR
══════════════════════════════════════════════════════════════════════════════ */

(function ($) {
    // Funció que actualitza el fons (track) del range segons el valor actual
    function updateVolumeSliderBg($range) {
        var val = parseInt($range.val(), 10);
        var min = parseInt($range.attr('min') || 0, 10);
        var max = parseInt($range.attr('max') || 10, 10);
        var percent = (val - min) * 100 / (max - min);
        // Detectar si l'element està rotat (Chrome) o no (Firefox)
        var hasRotate = ($range.css('transform') && $range.css('transform') !== 'none');
        var direction = hasRotate ? 'to right' : 'to top';
        var gradient = 'linear-gradient(' + direction + ',rgb(255, 255, 255) 0%,rgb(255, 255, 255) ' + percent + '%,rgb(138, 138, 138) ' + percent + '%,rgb(138, 138, 138) 100%)';
        // Com el slider està girat -90deg, el gradient horitzontal es converteix en vertical visualment
        $range.css('background', gradient);
    }

    // Aplicar als sliders ja presents i als futurs (delegació)
    function initVolumeSliders() {
        $('.able-volume-slider input[type=range]').each(function () {
            var $rng = $(this);
            updateVolumeSliderBg($rng);
        });
    }

    // Quan el DOM està llest
    $(function () {
        // Inicialitzar els sliders existents
        initVolumeSliders();

        // Delegar events per a qualsevol canvi de valor
        $(document).on('input change', '.able-volume-slider input[type=range]', function () {
            updateVolumeSliderBg($(this));
        });

        // Com que AblePlayer pot crear sliders dinàmicament, escoltem l'esdeveniment personalitzat
        $(document).on('ableplayer-volume-slider-created', function () {
            initVolumeSliders();
        });
    });

    // Eliminar bindings anteriors, si existeixen
    $(document).off('mousedown.ableVolDrag mouseup.ableVolDrag');

    var currentVolSlider = null;
    var currentVolStartVal = null;
    var debugVolumeOverlay = false; // posar a false per desactivar el marcatge visual
    var $volOverlay = null;

    // Configuració de toleràncies
    var tolX = 12;   // píxels horitzontals
    var tolY = 15;   // píxels verticals

    // Quan comença el drag
    $(document).on('mousedown.ableVolDrag', '.able-volume-slider input[type=range]', function (e) {
        currentVolSlider = this;
        currentVolStartVal = $(this).val();

        if (debugVolumeOverlay) {
            var rect = this.getBoundingClientRect();
            var overlayRect = {
                left: (rect.left - tolX) + 'px',
                top: (rect.top - tolY) + 'px',
                width: (rect.width + tolX * 2) + 'px',
                height: (rect.height + tolY * 2) + 'px'
            };
            $volOverlay = $('<div>', {
                id: 'vol-debug-overlay'
            }).css({
                position: 'fixed',
                left: overlayRect.left,
                top: overlayRect.top,
                width: overlayRect.width,
                height: overlayRect.height,
                border: '2px dashed rgba(0,255,0,0.7)',
                'pointer-events': 'none',
                'z-index': 2147483647
            });
            $('body').append($volOverlay);
        }
    });

    // Quan es deixa anar el botó
    $(document).on('mouseup.ableVolDrag', function (e) {
        if (!currentVolSlider) return;
        var rect = currentVolSlider.getBoundingClientRect();
        var inside = (
            e.clientX >= rect.left - tolX &&
            e.clientX <= rect.right + tolX &&
            e.clientY >= rect.top - tolY &&
            e.clientY <= rect.bottom + tolY
        );
        if (!inside) {
            // Cancel·lar i restaurar valor inicial
            $(currentVolSlider).val(currentVolStartVal).trigger('input').trigger('change');
        }
        // Elimina overlay si existeix
        if ($volOverlay) {
            $volOverlay.remove();
            $volOverlay = null;
        }
        // Reset variables
        currentVolSlider = null;
        currentVolStartVal = null;
    });

})(jQuery);

/* ═══════════════════════════════════════════════════════════════════════════
   ASSEGURAR COLOR GRADIENT EN OBRIR EL POP-UP DE VOLUM
══════════════════════════════════════════════════════════════════════════════ */
(function ($) {
    var oldShowVolumePopup = AblePlayer.prototype.showVolumePopup;
    AblePlayer.prototype.showVolumePopup = function () {
        oldShowVolumePopup.apply(this, arguments);
        var $range = this.$volumeSlider && this.$volumeSlider.length ? this.$volumeSlider.find('input[type=range]') : null;
        if ($range && $range.length) {
            $range.trigger('input');
        }
    };
})(jQuery);

/* ═══════════════════════════════════════════════════════════════════════════
    BOTÓ DE TANCAMENT DEL DIÀLEG ACCESSIBLE --> DE TEXT A SVG
══════════════════════════════════════════════════════════════════════════════ */

(function ($) {
    var OldAccessibleDialog = window.AccessibleDialog;
    function NewAccessibleDialog() {
        OldAccessibleDialog.apply(this, arguments);

        var $btn = this.modal.children('.modalCloseButton').first();
        if (!$btn.length || $btn.find('svg').length) return;  // ja fet

        var svgData = AblePlayer.prototype.getSvgData('close');
        var svgNS = 'http://www.w3.org/2000/svg';

        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', svgData[0]);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');

        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', svgData[1]);
        svg.appendChild(path);

        var $sr = $('<span>', { class: 'able-clipped', text: $btn.attr('aria-label') });

        $btn.empty().append(svg, $sr);
    }
    NewAccessibleDialog.prototype = Object.create(OldAccessibleDialog.prototype);
    NewAccessibleDialog.prototype.constructor = NewAccessibleDialog;
    window.AccessibleDialog = NewAccessibleDialog;
})(jQuery);



/* ═══════════════════════════════════════════════════════════════════════════
    BOTÓ DE PREFERÈNCIES DE LA TRANSCRIPCIÓ -->  DE IMG A SVG
══════════════════════════════════════════════════════════════════════════════ */
/* Afegir una icona SVG al botó de preferències de la transcripció  */
(function ($) {

    // Guardem la versió original d’injectTranscriptArea
    var oldInjectTranscriptArea = AblePlayer.prototype.injectTranscriptArea;

    AblePlayer.prototype.injectTranscriptArea = function () {

        // Primer executem el codi original
        oldInjectTranscriptArea.apply(this, arguments);

        /* 1. Localitzem el botó */
        var $btn = this.$transcriptArea
            .find('.able-button-handler-preferences')
            .first();

        /* 2. Si no existeix o ja té un <svg>, no fem res */
        if (!$btn.length || $btn.find('svg').length) return;

        /* 3. Construïm l’SVG que AblePlayer ja sap dibuixar */
        var svgData = AblePlayer.prototype.getSvgData('preferences');
        var svgNS = 'http://www.w3.org/2000/svg';

        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', svgData[0]);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');

        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', svgData[1]);
        svg.appendChild(path);

        /* 4. Etiqueta només per a lectors de pantalla  */
        var $sr = $('<span>', {
            'class': 'able-clipped',
            text: $btn.attr('aria-label')
        });

        /* 5. Substituïm el <img> original pel nostre SVG */
        $btn.empty().append(svg, $sr);
    };

})(jQuery);


/* ═══════════════════════════════════════════════════════════════════════════
    MODAL DE PREFERÈNCIES: ELIMINAR L'<HR> I AGRUPAR ELS BOTONS DINS UN DIV  
══════════════════════════════════════════════════════════════════════════════ */
(function ($) {

    const _injectPrefsForm = AblePlayer.prototype.injectPrefsForm;
    AblePlayer.prototype.injectPrefsForm = function (form) {

        _injectPrefsForm.call(this, form);

        const $dlg = $('.able-prefs-form-' + form).last();

        // 1. eliminar l’<hr>
        $dlg.find('hr').remove();

        // 2. agrupar els dos botons dins un div
        const $buttons = $dlg.find('button.modal-button');
        $('<div class="modal-btn-wrapper" />')
            .append($buttons)
            .appendTo($dlg);
    };

})(jQuery);


/* ═══════════════════════════════════════════════════════════════════════════
    MODAL DE PREFERÈNCIES DEL TRANSCRIPT: ELIMINAR L'<HR> I AGRUPAR ELS BOTONS DINS UN DIV  
══════════════════════════════════════════════════════════════════════════════ */
(function ($) {

    const _addResizeDialog = AblePlayer.prototype.addResizeDialog;

    AblePlayer.prototype.addResizeDialog = function (which, $window) {

        _addResizeDialog.call(this, which, $window);

        const $dlg = $('.able-resize-form').last();

        // 1. Eliminem l’<hr>
        $dlg.find('hr').remove();

        // 2. Apleguem els dos botons en un contenidor nou
        const $buttons = $dlg.find('button.modal-button');
        $('<div class="modal-btn-wrapper" />')
            .append($buttons)
            .appendTo($dlg);
    };

})(jQuery);


/* ═══════════════════════════════════════════════════════════════════════════
    CANVI PER DEFECTE DE LES TECLES MODIFICADORES (ALT, CTRL, MAJÚSCULA)
══════════════════════════════════════════════════════════════════════════════ */
(function ($) {

    const _getAvailablePreferences = AblePlayer.prototype.getAvailablePreferences;

    AblePlayer.prototype.getAvailablePreferences = function () {

        const prefs = _getAvailablePreferences.call(this);

        // Modifiquem els valors per defecte
        prefs.forEach(p => {
            if (p.name === 'prefAltKey') p.default = 0; // Alt desactivat
            if (p.name === 'prefCtrlKey') p.default = 1; // Ctrl activada
            if (p.name === 'prefShiftKey') p.default = 1; // Majúscula activada      
        });

        return prefs;
    };

})(jQuery);


/* ══════════════════════════════════════════════════════════════════════
   Ajustar l’alçada interna de la transcripció (-105 px en comptes de -50)
═══════════════════════════════════════════════════════════════════════ */
(function () {
    var origResizeObject = AblePlayer.prototype.resizeObject;

    AblePlayer.prototype.resizeObject = function (which, width, height) {

        origResizeObject.apply(this, arguments);

        if (which === 'transcript') {
            var innerHeight = height - 105;
            this.$transcriptDiv.css('height', innerHeight + 'px');
        }
    };
})();



/* ══════════════════════════════════════════════════════════════════════
    Treure opcions del menú de preferències si no hi ha els tracks corresponents
═══════════════════════════════════════════════════════════════════════ */

(function ($) {
 
  var originalCreatePopup = AblePlayer.prototype.createPopup;

  AblePlayer.prototype.createPopup = function (which, tracks) {
    var thisObj = this;

    // Si no és menú de preferències, utilitzar implementació original
    if (which !== 'prefs') {
      return originalCreatePopup.call(this, which, tracks);
    }

    // Cachear resultats per evitar crides repetides
    var hasTextTracks = this.mediaElement && this.mediaElement.textTracks && this.mediaElement.textTracks.length > 0;
    var hasMediaElement = this.$media && this.$media.length > 0;
    
    // Funció helper per verificar tracks per tipus
    var hasTracksByKind = function(kind) {
      if (!hasTextTracks) return false;
      for (var t = 0; t < this.mediaElement.textTracks.length; t++) {
        if (this.mediaElement.textTracks[t].kind === kind) return true;
      }
      return false;
    }.bind(this);

    // Funció helper per verificar tracks HTML
    var hasHtmlTracks = function(selector) {
      return hasMediaElement && this.$media.find(selector).length > 0;
    }.bind(this);

    // Funció helper per verificar YouTube/Vimeo
    var hasYouTubeCaptions = function() {
      return this.player === 'youtube' && (
        (this.youtubeCaptions && this.youtubeCaptions.length > 0) ||
        (this.captions && this.captions.length > 0) ||
        hasTextTracks ||
        hasHtmlTracks('track')
      );
    }.bind(this);

    var hasVimeoCaptions = function() {
      return this.player === 'vimeo' && this.vimeoCaptions && this.vimeoCaptions.length > 0;
    }.bind(this);

    // Mapeig de tipus de preferències amb les seves condicions
    var prefConditions = {
      'descriptions': function() {
        return hasTracksByKind('descriptions') ||
               hasHtmlTracks('track[kind="descriptions"]') ||
               (this.player === 'youtube' && (this.youtubeDescId || this.$media.attr('data-youtube-desc-id'))) ||
               (this.player === 'vimeo' && this.vimeoDescId);
      },
      'captions': function() {
        return hasTracksByKind('captions') || hasTracksByKind('subtitles') ||
               hasHtmlTracks('track[kind="captions"], track[kind="subtitles"]') ||
               hasYouTubeCaptions() || hasVimeoCaptions();
      },
      'transcript': function() {
        var includeTranscript = this.$media.attr('data-include-transcript');
        
        if (includeTranscript === 'false') {
          return !!(this.transcriptDiv || this.$media.attr('data-transcript-div'));
        }
        
        return hasTextTracks ||
               hasHtmlTracks('track') ||
               hasYouTubeCaptions() ||
               hasVimeoCaptions() ||
               (this.transcriptType && this.transcriptType !== 'external') ||
               (this.transcriptDiv || this.$media.attr('data-transcript-div'));
      },
      'keyboard': function() { return true; } // Sempre incloure
    };

    // Mapeig de textos i dialogs
    var prefConfig = {
      'captions': {
        text: this.tt.prefMenuCaptions,
        dialog: 'captionPrefsDialog'
      },
      'descriptions': {
        text: this.tt.prefMenuDescriptions,
        dialog: 'descPrefsDialog'
      },
      'keyboard': {
        text: this.tt.prefMenuKeyboard,
        dialog: 'keyboardPrefsDialog'
      },
      'transcript': {
        text: this.tt.prefMenuTranscript,
        dialog: 'transcriptPrefsDialog'
      }
    };

    // Filtrar preferències disponibles
    var filteredPrefCats = this.prefCats.filter(function(prefCat) {
      return prefConditions[prefCat] && prefConditions[prefCat].call(this);
    }.bind(this));

    // Si no hi ha preferències, retornar
    if (filteredPrefCats.length === 0) {
      return $('<ul>').hide();
    }

    // Crear menú
    var $menu = $('<ul>', {
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup',
      'role': 'menu'
    }).hide();

    // Crear ítems del menú
    filteredPrefCats.forEach(function(prefCat) {
      var config = prefConfig[prefCat];
      var $menuItem = $('<li>', {
        'role': 'menuitem',
        'tabindex': '-1',
        'text': config.text
      });

      $menuItem.on('click', function() {
        thisObj.showingPrefsDialog = true;
        thisObj.setFullscreen(false);
        thisObj[config.dialog].show();
        thisObj.closePopups();
        thisObj.showingPrefsDialog = false;
      });

      $menu.append($menuItem);
    });

    this.$prefsButton.attr('data-prefs-popup', 'menu');
    this.$controllerDiv.append($menu);
    return $menu;
  };

})(jQuery);