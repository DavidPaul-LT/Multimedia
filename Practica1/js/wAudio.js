/**
 * wAudio.js - A cross-browser Web Audio API wrapper with HTML5 Audio fallback
 * https://github.com/adityaravishankar/wAudio.js
 * 
 * MIT License
 */

(function(window) {
    "use strict";

    // Check if Web Audio is supported
    var webAudioSupported = false;
    var audioContext = null;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        webAudioSupported = true;
    } catch (e) {
        webAudioSupported = false;
    }

    // Store instances for garbage collection
    var instances = [];

    /**
     * wAudio constructor - Creates a new audio object
     * @param {String} src - Optional source URL
     */
    var wAudio = function(src) {
        // Use Web Audio if supported, otherwise fallback to HTML5 Audio
        if (webAudioSupported) {
            return new WebAudioInstance(src);
        } else {
            return new FallbackInstance(src);
        }
    };

    /**
     * Play a muted sound to unlock audio on mobile devices
     * This should be called on the first user interaction
     */
    wAudio.playMutedSound = function() {
        if (!webAudioSupported) return;
        
        try {
            var bufferSize = 4096;
            var silentNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
            silentNode.connect(audioContext.destination);
            
            var oscillator = audioContext.createOscillator();
            oscillator.connect(silentNode);
            oscillator.start(0);
            oscillator.stop(0.001);
            
            setTimeout(function() {
                silentNode.disconnect();
            }, 100);
        } catch (e) {
            // Silently fail - this is just to unlock audio
        }
    };

    /**
     * Automatically enable audio on mobile devices on first touch
     */
    wAudio.mobileAutoEnable = false;

    if (wAudio.mobileAutoEnable && webAudioSupported) {
        var enableAudio = function() {
            wAudio.playMutedSound();
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('touchend', enableAudio);
            document.removeEventListener('mousedown', enableAudio);
            document.removeEventListener('mouseup', enableAudio);
        };
        
        document.addEventListener('touchstart', enableAudio);
        document.addEventListener('touchend', enableAudio);
        document.addEventListener('mousedown', enableAudio);
        document.addEventListener('mouseup', enableAudio);
    }

    /**
     * WebAudioInstance - Uses Web Audio API for playback
     */
    var WebAudioInstance = function(src) {
        this.src = src || '';
        this.loop = false;
        this.autoplay = false;
        this._volume = 1;
        this._muted = false;
        this._paused = true;
        this._ended = false;
        this._currentTime = 0;
        this._duration = 0;
        this._buffer = null;
        this._source = null;
        this._gainNode = null;
        this._startTime = 0;
        this._pauseTime = 0;
        this._isLoading = false;
        this._eventListeners = {};

        // Create gain node for volume control
        this._gainNode = audioContext.createGain();
        this._gainNode.connect(audioContext.destination);
        this._gainNode.gain.value = this._volume;

        instances.push(this);
        this._load();
    };

    WebAudioInstance.prototype = {
        _load: function() {
            if (!this.src || this._isLoading) return;
            
            this._isLoading = true;
            var self = this;
            
            // Use XHR to load audio file
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.src, true);
            xhr.responseType = 'arraybuffer';
            
            xhr.onload = function() {
                audioContext.decodeAudioData(xhr.response, function(buffer) {
                    self._buffer = buffer;
                    self._duration = buffer.duration;
                    self._isLoading = false;
                    
                    // Trigger canplaythrough event
                    self._triggerEvent('canplaythrough');
                    
                    if (self.autoplay) {
                        self.play();
                    }
                }, function(error) {
                    console.error('wAudio: Error decoding audio data', error);
                    self._isLoading = false;
                });
            };
            
            xhr.onerror = function() {
                console.error('wAudio: Error loading audio file', self.src);
                self._isLoading = false;
                self._triggerEvent('error');
            };
            
            xhr.send();
        },

        play: function() {
            if (!this._buffer || this._isLoading) {
                // If buffer not loaded yet, set autoplay and wait
                this.autoplay = true;
                return;
            }

            if (!this._paused && this._source) return;

            // Create new source node
            this._source = audioContext.createBufferSource();
            this._source.buffer = this._buffer;
            this._source.loop = this.loop;
            this._source.connect(this._gainNode);
            
            // Handle ended event
            var self = this;
            this._source.onended = function() {
                if (self._source && !self._source.loop) {
                    self._ended = true;
                    self._paused = true;
                    self._currentTime = 0;
                    self._triggerEvent('ended');
                }
            };

            // Start playback
            var offset = this._currentTime;
            if (this._ended) {
                offset = 0;
                this._ended = false;
            }
            
            this._startTime = audioContext.currentTime - offset;
            this._source.start(0, offset);
            this._paused = false;

            this._triggerEvent('play');
        },

        pause: function() {
            if (this._paused || !this._source) return;
            
            this._pauseTime = audioContext.currentTime;
            this._source.stop(0);
            this._source.disconnect();
            this._source = null;
            
            this._paused = true;
            this._currentTime = this._pauseTime - this._startTime;
            
            this._triggerEvent('pause');
        },

        stop: function() {
            this.pause();
            this._currentTime = 0;
            this._ended = true;
            this._triggerEvent('ended');
        },

        addEventListener: function(event, callback) {
            if (!this._eventListeners[event]) {
                this._eventListeners[event] = [];
            }
            this._eventListeners[event].push(callback);
        },

        removeEventListener: function(event, callback) {
            if (!this._eventListeners[event]) return;
            
            var index = this._eventListeners[event].indexOf(callback);
            if (index !== -1) {
                this._eventListeners[event].splice(index, 1);
            }
        },

        _triggerEvent: function(event) {
            if (!this._eventListeners[event]) return;
            
            for (var i = 0; i < this._eventListeners[event].length; i++) {
                this._eventListeners[event][i].call(this);
            }
        },

        // Getters and setters
        get volume() {
            return this._muted ? 0 : this._volume;
        },

        set volume(value) {
            this._volume = Math.max(0, Math.min(1, value));
            if (!this._muted) {
                this._gainNode.gain.value = this._volume;
            }
        },

        get muted() {
            return this._muted;
        },

        set muted(value) {
            this._muted = !!value;
            this._gainNode.gain.value = this._muted ? 0 : this._volume;
        },

        get currentTime() {
            if (this._paused || !this._source) {
                return this._currentTime;
            } else {
                return audioContext.currentTime - this._startTime;
            }
        },

        set currentTime(value) {
            var wasPaused = this._paused;
            if (!wasPaused) {
                this.pause();
            }
            this._currentTime = Math.max(0, Math.min(value, this._duration));
            this._ended = false;
            if (!wasPaused) {
                this.play();
            }
        },

        get duration() {
            return this._duration;
        },

        get paused() {
            return this._paused;
        },

        get ended() {
            return this._ended;
        },

        get loop() {
            return this._loop;
        },

        set loop(value) {
            this._loop = !!value;
            if (this._source) {
                this._source.loop = this._loop;
            }
        },

        get src() {
            return this._src;
        },

        set src(value) {
            if (this._src !== value) {
                this._src = value;
                this._load();
            }
        }
    };

    /**
     * FallbackInstance - Uses HTML5 Audio for fallback when Web Audio is not supported
     */
    var FallbackInstance = function(src) {
        this._audio = new Audio(src);
        instances.push(this);
    };

    FallbackInstance.prototype = {
        play: function() { this._audio.play(); },
        pause: function() { this._audio.pause(); },
        stop: function() { this._audio.pause(); this._audio.currentTime = 0; },
        
        addEventListener: function(event, callback) {
            this._audio.addEventListener(event, callback);
        },
        
        removeEventListener: function(event, callback) {
            this._audio.removeEventListener(event, callback);
        },
        
        get volume() { return this._audio.volume; },
        set volume(value) { this._audio.volume = value; },
        
        get muted() { return this._audio.muted; },
        set muted(value) { this._audio.muted = value; },
        
        get currentTime() { return this._audio.currentTime; },
        set currentTime(value) { this._audio.currentTime = value; },
        
        get duration() { return this._audio.duration; },
        get paused() { return this._audio.paused; },
        get ended() { return this._audio.ended; },
        
        get loop() { return this._audio.loop; },
        set loop(value) { this._audio.loop = value; },
        
        get src() { return this._audio.src; },
        set src(value) { this._audio.src = value; }
    };

    // Clean up instances (optional - for memory management)
    wAudio.cleanup = function() {
        instances = [];
    };

    // Expose wAudio globally
    window.wAudio = wAudio;

})(window);