!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.3.1';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr(`data-${pluginName}`)) {
        plugin.$element.attr(`data-${pluginName}`, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger(`init.zf.${pluginName}`);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr(`data-${pluginName}`).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger(`destroyed.zf.${pluginName}`);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? `-${namespace}` : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError(`We're sorry, ${type} is not a valid parameter. You must use a string representing the method you wish to invoke.`);
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if ('true' === str) return true;else if ('false' === str) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets

    /**
     * Compares the dimensions of an element to a container and determines collision events with container.
     * @function
     * @param {jQuery} element - jQuery object to test for collisions.
     * @param {jQuery} parent - jQuery object to use as bounding container.
     * @param {Boolean} lrOnly - set to true to check left and right values only.
     * @param {Boolean} tbOnly - set to true to check top and bottom values only.
     * @default if no parent object passed, detects collisions with `window`.
     * @returns {Boolean} - true if collision free, false if a collision in any direction.
     */
  };function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  const keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey(event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();

      // Remove un-printable characters, e.g. for `fromCharCode` calls for CTRL only events
      key = key.replace(/\W+/, '');

      if (event.shiftKey) key = `SHIFT_${key}`;
      if (event.ctrlKey) key = `CTRL_${key}`;
      if (event.altKey) key = `ALT_${key}`;

      // Remove trailing underscore, in case only modifiers were used (e.g. only `CTRL_ALT`)
      key = key.replace(/_$/, '');

      return key;
    },

    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey(event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },

    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable($element) {
      if (!$element) {
        return false;
      }
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },

    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register(componentName, cmds) {
      commands[componentName] = cmds;
    },

    /**
     * Traps the focus in the given element.
     * @param  {jQuery} $element  jQuery object to trap the foucs into.
     */
    trapFocus($element) {
      var $focusable = Foundation.Keyboard.findFocusable($element),
          $firstFocusable = $focusable.eq(0),
          $lastFocusable = $focusable.eq(-1);

      $element.on('keydown.zf.trapfocus', function (event) {
        if (event.target === $lastFocusable[0] && Foundation.Keyboard.parseKey(event) === 'TAB') {
          event.preventDefault();
          $firstFocusable.focus();
        } else if (event.target === $firstFocusable[0] && Foundation.Keyboard.parseKey(event) === 'SHIFT_TAB') {
          event.preventDefault();
          $lastFocusable.focus();
        }
      });
    },
    /**
     * Releases the trapped focus from the given element.
     * @param  {jQuery} $element  jQuery object to release the focus for.
     */
    releaseFocus($element) {
      $element.off('keydown.zf.trapfocus');
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) k[kcs[kc]] = kcs[kc];
    return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  const defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init() {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: `only screen and (min-width: ${namedQueries[key]})`
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },

    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast(size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },

    /**
     * Checks if the screen matches to a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check, either 'small only' or 'small'. Omitting 'only' falls back to using atLeast() method.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it does not.
     */
    is(size) {
      size = size.trim().split(' ');
      if (size.length > 1 && size[1] === 'only') {
        if (size[0] === this._getCurrentSize()) return true;
      } else {
        return this.atLeast(size[0]);
      }
      return false;
    },

    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get(size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },

    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize() {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },

    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher() {
      $(window).on('resize.zf.mediaquery', () => {
        var newSize = this._getCurrentSize(),
            currentSize = this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium(media) {
          var text = `@media ${media}{ #matchmediajs-test { width: 1px; } }`;

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  const initClasses = ['mui-enter', 'mui-leave'];
  const activeClasses = ['mui-enter-active', 'mui-leave-active'];

  const Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    if (duration === 0) {
      fn.apply(elem);
      elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      return;
    }

    function move(ts) {
      if (!start) start = ts;
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(() => {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(() => {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(`${initClass} ${activeClass} ${animation}`);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  const Nest = {
    Feather(menu, type = 'zf') {
      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = `is-${type}-submenu`,
          subItemClass = `${subMenuClass}-item`,
          hasSubClass = `is-${type}-submenu-parent`;

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-label': $item.children('a:first').text()
          });
          // Note:  Drilldowns behave differently in how they hide, and so need
          // additional attributes.  We should look if this possibly over-generalized
          // utility (Nest) is appropriate when we rework menus in 6.4
          if (type === 'drilldown') {
            $item.attr({ 'aria-expanded': false });
          }

          $sub.addClass(`submenu ${subMenuClass}`).attr({
            'data-submenu': '',
            'role': 'menu'
          });
          if (type === 'drilldown') {
            $sub.attr({ 'aria-hidden': true });
          }
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass(`is-submenu-item ${subItemClass}`);
        }
      });

      return;
    },

    Burn(menu, type) {
      var //items = menu.find('li'),
      subMenuClass = `is-${type}-submenu`,
          subItemClass = `${subMenuClass}-item`,
          hasSubClass = `is-${type}-submenu-parent`;

      menu.find('>li, .menu, .menu > li').removeClass(`${subMenuClass} ${subItemClass} ${hasSubClass} is-submenu-item submenu is-active`).removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger(`timerstart.zf.${nameSpace}`);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger(`timerpaused.zf.${nameSpace}`);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      // Check if image is loaded
      if (this.complete || this.readyState === 4 || this.readyState === 'complete') {
        singleImageLoaded();
      }
      // Force load the image
      else {
          // fix for IE. See https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
          var src = $(this).attr('src');
          $(this).attr('src', src + (src.indexOf('?') >= 0 ? '&' : '?') + new Date().getTime());
          $(this).one('load', function () {
            singleImageLoaded();
          });
        }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger(`swipe${dir}`);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special[`swipe${this}`] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  const MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (`${prefixes[i]}MutationObserver` in window) {
        return window[`${prefixes[i]}MutationObserver`];
      }
    }
    return false;
  }();

  const triggers = (el, type) => {
    el.data(type).split(' ').forEach(id => {
      $(`#${id}`)[type === 'close' ? 'trigger' : 'triggerHandler'](`${type}.zf.trigger`, [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    let id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    let id = $(this).data('toggle');
    if (id) {
      triggers($(this), 'toggle');
    } else {
      $(this).trigger('toggle.zf.trigger');
    }
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    let animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    let id = $(this).data('toggle-focus');
    $(`#${id}`).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', () => {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    mutateListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      let listeners = plugNames.map(name => {
        return `closeme.zf.${name}`;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        let plugin = e.namespace.split('.')[0];
        let plugins = $(`[data-${plugin}]`).not(`[data-yeti-box="${pluginId}"]`);

        plugins.each(function () {
          let _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    let timer,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    let timer,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function mutateListener(debounce) {
    let $nodes = $('[data-mutate]');
    if ($nodes.length && MutationObserver) {
      //trigger all listening elements and signal a mutate event
      //no IE 9 or 10
      $nodes.each(function () {
        $(this).triggerHandler('mutateme.zf.trigger');
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    let nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);

      //trigger the event handler for the element depending on type
      switch (mutationRecordsList[0].type) {

        case "attributes":
          if ($target.attr("data-events") === "scroll" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          }
          if ($target.attr("data-events") === "resize" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('resizeme.zf.trigger', [$target]);
          }
          if (mutationRecordsList[0].attributeName === "style") {
            $target.closest("[data-mutate]").attr("data-events", "mutate");
            $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          }
          break;

        case "childList":
          $target.closest("[data-mutate]").attr("data-events", "mutate");
          $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, or mutation add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ["data-events", "style"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
;'use strict';

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  class Abide {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options = {}) {
      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */
    _init() {
      this.$inputs = this.$element.find('input, textarea, select');

      this._events();
    }

    /**
     * Initializes events for Abide.
     * @private
     */
    _events() {
      this.$element.off('.abide').on('reset.zf.abide', () => {
        this.resetForm();
      }).on('submit.zf.abide', () => {
        return this.validateForm();
      });

      if (this.options.validateOn === 'fieldChange') {
        this.$inputs.off('change.zf.abide').on('change.zf.abide', e => {
          this.validateInput($(e.target));
        });
      }

      if (this.options.liveValidate) {
        this.$inputs.off('input.zf.abide').on('input.zf.abide', e => {
          this.validateInput($(e.target));
        });
      }

      if (this.options.validateOnBlur) {
        this.$inputs.off('blur.zf.abide').on('blur.zf.abide', e => {
          this.validateInput($(e.target));
        });
      }
    }

    /**
     * Calls necessary functions to update Abide upon DOM change
     * @private
     */
    _reflow() {
      this._init();
    }

    /**
     * Checks whether or not a form element has the required attribute and if it's checked or not
     * @param {Object} element - jQuery object to check for required attribute
     * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
     */
    requiredCheck($el) {
      if (!$el.attr('required')) return true;

      var isGood = true;

      switch ($el[0].type) {
        case 'checkbox':
          isGood = $el[0].checked;
          break;

        case 'select':
        case 'select-one':
        case 'select-multiple':
          var opt = $el.find('option:selected');
          if (!opt.length || !opt.val()) isGood = false;
          break;

        default:
          if (!$el.val() || !$el.val().length) isGood = false;
      }

      return isGood;
    }

    /**
     * Based on $el, get the first element with selector in this order:
     * 1. The element's direct sibling('s).
     * 3. The element's parent's children.
     *
     * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
     *
     * @param {Object} $el - jQuery object to use as reference to find the form error selector.
     * @returns {Object} jQuery object with the selector.
     */
    findFormError($el) {
      var $error = $el.siblings(this.options.formErrorSelector);

      if (!$error.length) {
        $error = $el.parent().find(this.options.formErrorSelector);
      }

      return $error;
    }

    /**
     * Get the first element in this order:
     * 2. The <label> with the attribute `[for="someInputId"]`
     * 3. The `.closest()` <label>
     *
     * @param {Object} $el - jQuery object to check for required attribute
     * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
     */
    findLabel($el) {
      var id = $el[0].id;
      var $label = this.$element.find(`label[for="${id}"]`);

      if (!$label.length) {
        return $el.closest('label');
      }

      return $label;
    }

    /**
     * Get the set of labels associated with a set of radio els in this order
     * 2. The <label> with the attribute `[for="someInputId"]`
     * 3. The `.closest()` <label>
     *
     * @param {Object} $el - jQuery object to check for required attribute
     * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
     */
    findRadioLabels($els) {
      var labels = $els.map((i, el) => {
        var id = el.id;
        var $label = this.$element.find(`label[for="${id}"]`);

        if (!$label.length) {
          $label = $(el).closest('label');
        }
        return $label[0];
      });

      return $(labels);
    }

    /**
     * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
     * @param {Object} $el - jQuery object to add the class to
     */
    addErrorClasses($el) {
      var $label = this.findLabel($el);
      var $formError = this.findFormError($el);

      if ($label.length) {
        $label.addClass(this.options.labelErrorClass);
      }

      if ($formError.length) {
        $formError.addClass(this.options.formErrorClass);
      }

      $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
    }

    /**
     * Remove CSS error classes etc from an entire radio button group
     * @param {String} groupName - A string that specifies the name of a radio button group
     *
     */

    removeRadioErrorClasses(groupName) {
      var $els = this.$element.find(`:radio[name="${groupName}"]`);
      var $labels = this.findRadioLabels($els);
      var $formErrors = this.findFormError($els);

      if ($labels.length) {
        $labels.removeClass(this.options.labelErrorClass);
      }

      if ($formErrors.length) {
        $formErrors.removeClass(this.options.formErrorClass);
      }

      $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
    }

    /**
     * Removes CSS error class as specified by the Abide settings from the label, input, and the form
     * @param {Object} $el - jQuery object to remove the class from
     */
    removeErrorClasses($el) {
      // radios need to clear all of the els
      if ($el[0].type == 'radio') {
        return this.removeRadioErrorClasses($el.attr('name'));
      }

      var $label = this.findLabel($el);
      var $formError = this.findFormError($el);

      if ($label.length) {
        $label.removeClass(this.options.labelErrorClass);
      }

      if ($formError.length) {
        $formError.removeClass(this.options.formErrorClass);
      }

      $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
    }

    /**
     * Goes through a form to find inputs and proceeds to validate them in ways specific to their type. 
     * Ignores inputs with data-abide-ignore, type="hidden" or disabled attributes set
     * @fires Abide#invalid
     * @fires Abide#valid
     * @param {Object} element - jQuery object to validate, should be an HTML input
     * @returns {Boolean} goodToGo - If the input is valid or not.
     */
    validateInput($el) {
      var clearRequire = this.requiredCheck($el),
          validated = false,
          customValidator = true,
          validator = $el.attr('data-validator'),
          equalTo = true;

      // don't validate ignored inputs or hidden inputs or disabled inputs
      if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]') || $el.is('[disabled]')) {
        return true;
      }

      switch ($el[0].type) {
        case 'radio':
          validated = this.validateRadio($el.attr('name'));
          break;

        case 'checkbox':
          validated = clearRequire;
          break;

        case 'select':
        case 'select-one':
        case 'select-multiple':
          validated = clearRequire;
          break;

        default:
          validated = this.validateText($el);
      }

      if (validator) {
        customValidator = this.matchValidation($el, validator, $el.attr('required'));
      }

      if ($el.attr('data-equalto')) {
        equalTo = this.options.validators.equalTo($el);
      }

      var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
      var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

      if (goodToGo) {
        // Re-validate inputs that depend on this one with equalto
        const dependentElements = this.$element.find(`[data-equalto="${$el.attr('id')}"]`);
        if (dependentElements.length) {
          let _this = this;
          dependentElements.each(function () {
            if ($(this).val()) {
              _this.validateInput($(this));
            }
          });
        }
      }

      this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

      /**
       * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
       * Trigger includes the DOM element of the input.
       * @event Abide#valid
       * @event Abide#invalid
       */
      $el.trigger(message, [$el]);

      return goodToGo;
    }

    /**
     * Goes through a form and if there are any invalid inputs, it will display the form error element
     * @returns {Boolean} noError - true if no errors were detected...
     * @fires Abide#formvalid
     * @fires Abide#forminvalid
     */
    validateForm() {
      var acc = [];
      var _this = this;

      this.$inputs.each(function () {
        acc.push(_this.validateInput($(this)));
      });

      var noError = acc.indexOf(false) === -1;

      this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

      /**
       * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
       * Trigger includes the element of the form.
       * @event Abide#formvalid
       * @event Abide#forminvalid
       */
      this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

      return noError;
    }

    /**
     * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
     * @param {Object} $el - jQuery object to validate, should be a text input HTML element
     * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
     * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
     */
    validateText($el, pattern) {
      // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
      pattern = pattern || $el.attr('pattern') || $el.attr('type');
      var inputText = $el.val();
      var valid = false;

      if (inputText.length) {
        // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
        if (this.options.patterns.hasOwnProperty(pattern)) {
          valid = this.options.patterns[pattern].test(inputText);
        }
        // If the pattern name isn't also the type attribute of the field, then test it as a regexp
        else if (pattern !== $el.attr('type')) {
            valid = new RegExp(pattern).test(inputText);
          } else {
            valid = true;
          }
      }
      // An empty field is valid if it's not required
      else if (!$el.prop('required')) {
          valid = true;
        }

      return valid;
    }

    /**
     * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
     * @param {String} groupName - A string that specifies the name of a radio button group
     * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
     */
    validateRadio(groupName) {
      // If at least one radio in the group has the `required` attribute, the group is considered required
      // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
      var $group = this.$element.find(`:radio[name="${groupName}"]`);
      var valid = false,
          required = false;

      // For the group to be required, at least one radio needs to be required
      $group.each((i, e) => {
        if ($(e).attr('required')) {
          required = true;
        }
      });
      if (!required) valid = true;

      if (!valid) {
        // For the group to be valid, at least one radio needs to be checked
        $group.each((i, e) => {
          if ($(e).prop('checked')) {
            valid = true;
          }
        });
      };

      return valid;
    }

    /**
     * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
     * @param {Object} $el - jQuery input element.
     * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
     * @param {Boolean} required - self explanatory?
     * @returns {Boolean} - true if validations passed.
     */
    matchValidation($el, validators, required) {
      required = required ? true : false;

      var clear = validators.split(' ').map(v => {
        return this.options.validators[v]($el, required, $el.parent());
      });
      return clear.indexOf(false) === -1;
    }

    /**
     * Resets form inputs and styles
     * @fires Abide#formreset
     */
    resetForm() {
      var $form = this.$element,
          opts = this.options;

      $(`.${opts.labelErrorClass}`, $form).not('small').removeClass(opts.labelErrorClass);
      $(`.${opts.inputErrorClass}`, $form).not('small').removeClass(opts.inputErrorClass);
      $(`${opts.formErrorSelector}.${opts.formErrorClass}`).removeClass(opts.formErrorClass);
      $form.find('[data-abide-error]').css('display', 'none');
      $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
      $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
      $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
      /**
       * Fires when the form has been reset.
       * @event Abide#formreset
       */
      $form.trigger('formreset.zf.abide', [$form]);
    }

    /**
     * Destroys an instance of Abide.
     * Removes error styles and classes from elements, without resetting their values.
     */
    destroy() {
      var _this = this;
      this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

      this.$inputs.off('.abide').each(function () {
        _this.removeErrorClasses($(this));
      });

      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @type {?string}
     * @default 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @type {string}
     * @default 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @type {string}
     * @default 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @type {string}
     * @default '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @type {string}
     * @default 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @type {boolean}
     * @default false
     */
    liveValidate: false,

    /**
     * Set to true to validate inputs on blur.
     * @option
     * @type {boolean}
     * @default false
     */
    validateOnBlur: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $(`#${el.attr('data-equalto')}`).val() === el.val();
      }
    }

    // Window exports
  };Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  class Accordion {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */
    _init() {
      this.$element.attr('role', 'tablist');
      this.$tabs = this.$element.children('[data-accordion-item]');

      this.$tabs.each(function (idx, el) {
        var $el = $(el),
            $content = $el.children('[data-tab-content]'),
            id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
            linkId = el.id || `${id}-label`;

        $el.find('a:first').attr({
          'aria-controls': id,
          'role': 'tab',
          'id': linkId,
          'aria-expanded': false,
          'aria-selected': false
        });

        $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
      });
      var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
      if ($initActive.length) {
        this.down($initActive, true);
      }
      this._events();
    }

    /**
     * Adds event handlers for items within the accordion.
     * @private
     */
    _events() {
      var _this = this;

      this.$tabs.each(function () {
        var $elem = $(this);
        var $tabContent = $elem.children('[data-tab-content]');
        if ($tabContent.length) {
          $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
            e.preventDefault();
            _this.toggle($tabContent);
          }).on('keydown.zf.accordion', function (e) {
            Foundation.Keyboard.handleKey(e, 'Accordion', {
              toggle: function () {
                _this.toggle($tabContent);
              },
              next: function () {
                var $a = $elem.next().find('a').focus();
                if (!_this.options.multiExpand) {
                  $a.trigger('click.zf.accordion');
                }
              },
              previous: function () {
                var $a = $elem.prev().find('a').focus();
                if (!_this.options.multiExpand) {
                  $a.trigger('click.zf.accordion');
                }
              },
              handled: function () {
                e.preventDefault();
                e.stopPropagation();
              }
            });
          });
        }
      });
    }

    /**
     * Toggles the selected content pane's open/close state.
     * @param {jQuery} $target - jQuery object of the pane to toggle (`.accordion-content`).
     * @function
     */
    toggle($target) {
      if ($target.parent().hasClass('is-active')) {
        this.up($target);
      } else {
        this.down($target);
      }
    }

    /**
     * Opens the accordion tab defined by `$target`.
     * @param {jQuery} $target - Accordion pane to open (`.accordion-content`).
     * @param {Boolean} firstTime - flag to determine if reflow should happen.
     * @fires Accordion#down
     * @function
     */
    down($target, firstTime) {
      $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

      if (!this.options.multiExpand && !firstTime) {
        var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
        if ($currentActive.length) {
          this.up($currentActive.not($target));
        }
      }

      $target.slideDown(this.options.slideSpeed, () => {
        /**
         * Fires when the tab is done opening.
         * @event Accordion#down
         */
        this.$element.trigger('down.zf.accordion', [$target]);
      });

      $(`#${$target.attr('aria-labelledby')}`).attr({
        'aria-expanded': true,
        'aria-selected': true
      });
    }

    /**
     * Closes the tab defined by `$target`.
     * @param {jQuery} $target - Accordion tab to close (`.accordion-content`).
     * @fires Accordion#up
     * @function
     */
    up($target) {
      var $aunts = $target.parent().siblings(),
          _this = this;

      if (!this.options.allowAllClosed && !$aunts.hasClass('is-active') || !$target.parent().hasClass('is-active')) {
        return;
      }

      // Foundation.Move(this.options.slideSpeed, $target, function(){
      $target.slideUp(_this.options.slideSpeed, function () {
        /**
         * Fires when the tab is done collapsing up.
         * @event Accordion#up
         */
        _this.$element.trigger('up.zf.accordion', [$target]);
      });
      // });

      $target.attr('aria-hidden', true).parent().removeClass('is-active');

      $(`#${$target.attr('aria-labelledby')}`).attr({
        'aria-expanded': false,
        'aria-selected': false
      });
    }

    /**
     * Destroys an instance of an accordion.
     * @fires Accordion#destroyed
     * @function
     */
    destroy() {
      this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
      this.$element.find('a').off('.zf.accordion');

      Foundation.unregisterPlugin(this);
    }
  }

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @type {number}
     * @default 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @type {boolean}
     * @default false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @type {boolean}
     * @default false
     */
    allowAllClosed: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  class AccordionMenu {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */
    _init() {
      this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
      this.$element.attr({
        'role': 'menu',
        'aria-multiselectable': this.options.multiOpen
      });

      this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
      this.$menuLinks.each(function () {
        var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
            $elem = $(this),
            $sub = $elem.children('[data-submenu]'),
            subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
            isActive = $sub.hasClass('is-active');
        $elem.attr({
          'aria-controls': subId,
          'aria-expanded': isActive,
          'role': 'menuitem',
          'id': linkId
        });
        $sub.attr({
          'aria-labelledby': linkId,
          'aria-hidden': !isActive,
          'role': 'menu',
          'id': subId
        });
      });
      var initPanes = this.$element.find('.is-active');
      if (initPanes.length) {
        var _this = this;
        initPanes.each(function () {
          _this.down($(this));
        });
      }
      this._events();
    }

    /**
     * Adds event handlers for items within the menu.
     * @private
     */
    _events() {
      var _this = this;

      this.$element.find('li').each(function () {
        var $submenu = $(this).children('[data-submenu]');

        if ($submenu.length) {
          $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
            e.preventDefault();

            _this.toggle($submenu);
          });
        }
      }).on('keydown.zf.accordionmenu', function (e) {
        var $element = $(this),
            $elements = $element.parent('ul').children('li'),
            $prevElement,
            $nextElement,
            $target = $element.children('[data-submenu]');

        $elements.each(function (i) {
          if ($(this).is($element)) {
            $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
            $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

            if ($(this).children('[data-submenu]:visible').length) {
              // has open sub menu
              $nextElement = $element.find('li:first-child').find('a').first();
            }
            if ($(this).is(':first-child')) {
              // is first element of sub menu
              $prevElement = $element.parents('li').first().find('a').first();
            } else if ($prevElement.parents('li').first().children('[data-submenu]:visible').length) {
              // if previous element has open sub menu
              $prevElement = $prevElement.parents('li').find('li:last-child').find('a').first();
            }
            if ($(this).is(':last-child')) {
              // is last element of sub menu
              $nextElement = $element.parents('li').first().next('li').find('a').first();
            }

            return;
          }
        });

        Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
          open: function () {
            if ($target.is(':hidden')) {
              _this.down($target);
              $target.find('li').first().find('a').first().focus();
            }
          },
          close: function () {
            if ($target.length && !$target.is(':hidden')) {
              // close active sub of this item
              _this.up($target);
            } else if ($element.parent('[data-submenu]').length) {
              // close currently open sub
              _this.up($element.parent('[data-submenu]'));
              $element.parents('li').first().find('a').first().focus();
            }
          },
          up: function () {
            $prevElement.focus();
            return true;
          },
          down: function () {
            $nextElement.focus();
            return true;
          },
          toggle: function () {
            if ($element.children('[data-submenu]').length) {
              _this.toggle($element.children('[data-submenu]'));
            }
          },
          closeAll: function () {
            _this.hideAll();
          },
          handled: function (preventDefault) {
            if (preventDefault) {
              e.preventDefault();
            }
            e.stopImmediatePropagation();
          }
        });
      }); //.attr('tabindex', 0);
    }

    /**
     * Closes all panes of the menu.
     * @function
     */
    hideAll() {
      this.up(this.$element.find('[data-submenu]'));
    }

    /**
     * Opens all panes of the menu.
     * @function
     */
    showAll() {
      this.down(this.$element.find('[data-submenu]'));
    }

    /**
     * Toggles the open/close state of a submenu.
     * @function
     * @param {jQuery} $target - the submenu to toggle
     */
    toggle($target) {
      if (!$target.is(':animated')) {
        if (!$target.is(':hidden')) {
          this.up($target);
        } else {
          this.down($target);
        }
      }
    }

    /**
     * Opens the sub-menu defined by `$target`.
     * @param {jQuery} $target - Sub-menu to open.
     * @fires AccordionMenu#down
     */
    down($target) {
      var _this = this;

      if (!this.options.multiOpen) {
        this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
      }

      $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

      //Foundation.Move(this.options.slideSpeed, $target, function() {
      $target.slideDown(_this.options.slideSpeed, function () {
        /**
         * Fires when the menu is done opening.
         * @event AccordionMenu#down
         */
        _this.$element.trigger('down.zf.accordionMenu', [$target]);
      });
      //});
    }

    /**
     * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
     * @param {jQuery} $target - Sub-menu to close.
     * @fires AccordionMenu#up
     */
    up($target) {
      var _this = this;
      //Foundation.Move(this.options.slideSpeed, $target, function(){
      $target.slideUp(_this.options.slideSpeed, function () {
        /**
         * Fires when the menu is done collapsing up.
         * @event AccordionMenu#up
         */
        _this.$element.trigger('up.zf.accordionMenu', [$target]);
      });
      //});

      var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

      $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
    }

    /**
     * Destroys an instance of accordion menu.
     * @fires AccordionMenu#destroyed
     */
    destroy() {
      this.$element.find('[data-submenu]').slideDown(0).css('display', '');
      this.$element.find('a').off('click.zf.accordionMenu');

      Foundation.Nest.Burn(this.$element, 'accordion');
      Foundation.unregisterPlugin(this);
    }
  }

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @type {number}
     * @default 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @type {boolean}
     * @default true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  class Drilldown {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */
    _init() {
      this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
      this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
      this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');
      this.$element.attr('data-mutate', this.$element.attr('data-drilldown') || Foundation.GetYoDigits(6, 'drilldown'));

      this._prepareMenu();
      this._registerEvents();

      this._keyboardEvents();
    }

    /**
     * prepares drilldown menu by setting attributes to links and elements
     * sets a min height to prevent content jumping
     * wraps the element if not already wrapped
     * @private
     * @function
     */
    _prepareMenu() {
      var _this = this;
      // if(!this.options.holdOpen){
      //   this._menuLinkEvents();
      // }
      this.$submenuAnchors.each(function () {
        var $link = $(this);
        var $sub = $link.parent();
        if (_this.options.parentLink) {
          $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
        }
        $link.data('savedHref', $link.attr('href')).removeAttr('href').attr('tabindex', 0);
        $link.children('[data-submenu]').attr({
          'aria-hidden': true,
          'tabindex': 0,
          'role': 'menu'
        });
        _this._events($link);
      });
      this.$submenus.each(function () {
        var $menu = $(this),
            $back = $menu.find('.js-drilldown-back');
        if (!$back.length) {
          switch (_this.options.backButtonPosition) {
            case "bottom":
              $menu.append(_this.options.backButton);
              break;
            case "top":
              $menu.prepend(_this.options.backButton);
              break;
            default:
              console.error("Unsupported backButtonPosition value '" + _this.options.backButtonPosition + "'");
          }
        }
        _this._back($menu);
      });

      this.$submenus.addClass('invisible');
      if (!this.options.autoHeight) {
        this.$submenus.addClass('drilldown-submenu-cover-previous');
      }

      // create a wrapper on element if it doesn't exist.
      if (!this.$element.parent().hasClass('is-drilldown')) {
        this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
        if (this.options.animateHeight) this.$wrapper.addClass('animate-height');
        this.$element.wrap(this.$wrapper);
      }
      // set wrapper
      this.$wrapper = this.$element.parent();
      this.$wrapper.css(this._getMaxDims());
    }

    _resize() {
      this.$wrapper.css({ 'max-width': 'none', 'min-height': 'none' });
      // _getMaxDims has side effects (boo) but calling it should update all other necessary heights & widths
      this.$wrapper.css(this._getMaxDims());
    }

    /**
     * Adds event handlers to elements in the menu.
     * @function
     * @private
     * @param {jQuery} $elem - the current menu item to add handlers to.
     */
    _events($elem) {
      var _this = this;

      $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
        if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }

        // if(e.target !== e.currentTarget.firstElementChild){
        //   return false;
        // }
        _this._show($elem.parent('li'));

        if (_this.options.closeOnClick) {
          var $body = $('body');
          $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
              return;
            }
            e.preventDefault();
            _this._hideAll();
            $body.off('.zf.drilldown');
          });
        }
      });
      this.$element.on('mutateme.zf.trigger', this._resize.bind(this));
    }

    /**
     * Adds event handlers to the menu element.
     * @function
     * @private
     */
    _registerEvents() {
      if (this.options.scrollTop) {
        this._bindHandler = this._scrollTop.bind(this);
        this.$element.on('open.zf.drilldown hide.zf.drilldown closed.zf.drilldown', this._bindHandler);
      }
    }

    /**
     * Scroll to Top of Element or data-scroll-top-element
     * @function
     * @fires Drilldown#scrollme
     */
    _scrollTop() {
      var _this = this;
      var $scrollTopElement = _this.options.scrollTopElement != '' ? $(_this.options.scrollTopElement) : _this.$element,
          scrollPos = parseInt($scrollTopElement.offset().top + _this.options.scrollTopOffset);
      $('html, body').stop(true).animate({ scrollTop: scrollPos }, _this.options.animationDuration, _this.options.animationEasing, function () {
        /**
          * Fires after the menu has scrolled
          * @event Drilldown#scrollme
          */
        if (this === $('html')[0]) _this.$element.trigger('scrollme.zf.drilldown');
      });
    }

    /**
     * Adds keydown event listener to `li`'s in the menu.
     * @private
     */
    _keyboardEvents() {
      var _this = this;

      this.$menuItems.add(this.$element.find('.js-drilldown-back > a, .is-submenu-parent-item > a')).on('keydown.zf.drilldown', function (e) {
        var $element = $(this),
            $elements = $element.parent('li').parent('ul').children('li').children('a'),
            $prevElement,
            $nextElement;

        $elements.each(function (i) {
          if ($(this).is($element)) {
            $prevElement = $elements.eq(Math.max(0, i - 1));
            $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
            return;
          }
        });

        Foundation.Keyboard.handleKey(e, 'Drilldown', {
          next: function () {
            if ($element.is(_this.$submenuAnchors)) {
              _this._show($element.parent('li'));
              $element.parent('li').one(Foundation.transitionend($element), function () {
                $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
              });
              return true;
            }
          },
          previous: function () {
            _this._hide($element.parent('li').parent('ul'));
            $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
              setTimeout(function () {
                $element.parent('li').parent('ul').parent('li').children('a').first().focus();
              }, 1);
            });
            return true;
          },
          up: function () {
            $prevElement.focus();
            // Don't tap focus on first element in root ul
            return !$element.is(_this.$element.find('> li:first-child > a'));
          },
          down: function () {
            $nextElement.focus();
            // Don't tap focus on last element in root ul
            return !$element.is(_this.$element.find('> li:last-child > a'));
          },
          close: function () {
            // Don't close on element in root ul
            if (!$element.is(_this.$element.find('> li > a'))) {
              _this._hide($element.parent().parent());
              $element.parent().parent().siblings('a').focus();
            }
          },
          open: function () {
            if (!$element.is(_this.$menuItems)) {
              // not menu item means back button
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            } else if ($element.is(_this.$submenuAnchors)) {
              _this._show($element.parent('li'));
              $element.parent('li').one(Foundation.transitionend($element), function () {
                $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
              });
              return true;
            }
          },
          handled: function (preventDefault) {
            if (preventDefault) {
              e.preventDefault();
            }
            e.stopImmediatePropagation();
          }
        });
      }); // end keyboardAccess
    }

    /**
     * Closes all open elements, and returns to root menu.
     * @function
     * @fires Drilldown#closed
     */
    _hideAll() {
      var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
      if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
      $elem.one(Foundation.transitionend($elem), function (e) {
        $elem.removeClass('is-active is-closing');
      });
      /**
       * Fires when the menu is fully closed.
       * @event Drilldown#closed
       */
      this.$element.trigger('closed.zf.drilldown');
    }

    /**
     * Adds event listener for each `back` button, and closes open menus.
     * @function
     * @fires Drilldown#back
     * @param {jQuery} $elem - the current sub-menu to add `back` event.
     */
    _back($elem) {
      var _this = this;
      $elem.off('click.zf.drilldown');
      $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
        e.stopImmediatePropagation();
        // console.log('mouseup on back');
        _this._hide($elem);

        // If there is a parent submenu, call show
        let parentSubMenu = $elem.parent('li').parent('ul').parent('li');
        if (parentSubMenu.length) {
          _this._show(parentSubMenu);
        }
      });
    }

    /**
     * Adds event listener to menu items w/o submenus to close open menus on click.
     * @function
     * @private
     */
    _menuLinkEvents() {
      var _this = this;
      this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
        // e.stopImmediatePropagation();
        setTimeout(function () {
          _this._hideAll();
        }, 0);
      });
    }

    /**
     * Opens a submenu.
     * @function
     * @fires Drilldown#open
     * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
     */
    _show($elem) {
      if (this.options.autoHeight) this.$wrapper.css({ height: $elem.children('[data-submenu]').data('calcHeight') });
      $elem.attr('aria-expanded', true);
      $elem.children('[data-submenu]').addClass('is-active').removeClass('invisible').attr('aria-hidden', false);
      /**
       * Fires when the submenu has opened.
       * @event Drilldown#open
       */
      this.$element.trigger('open.zf.drilldown', [$elem]);
    }

    /**
     * Hides a submenu
     * @function
     * @fires Drilldown#hide
     * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
     */
    _hide($elem) {
      if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
      var _this = this;
      $elem.parent('li').attr('aria-expanded', false);
      $elem.attr('aria-hidden', true).addClass('is-closing');
      $elem.addClass('is-closing').one(Foundation.transitionend($elem), function () {
        $elem.removeClass('is-active is-closing');
        $elem.blur().addClass('invisible');
      });
      /**
       * Fires when the submenu has closed.
       * @event Drilldown#hide
       */
      $elem.trigger('hide.zf.drilldown', [$elem]);
    }

    /**
     * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
     * Prevents content jumping.
     * @function
     * @private
     */
    _getMaxDims() {
      var maxHeight = 0,
          result = {},
          _this = this;
      this.$submenus.add(this.$element).each(function () {
        var numOfElems = $(this).children('li').length;
        var height = Foundation.Box.GetDimensions(this).height;
        maxHeight = height > maxHeight ? height : maxHeight;
        if (_this.options.autoHeight) {
          $(this).data('calcHeight', height);
          if (!$(this).hasClass('is-drilldown-submenu')) result['height'] = height;
        }
      });

      if (!this.options.autoHeight) result['min-height'] = `${maxHeight}px`;

      result['max-width'] = `${this.$element[0].getBoundingClientRect().width}px`;

      return result;
    }

    /**
     * Destroys the Drilldown Menu
     * @function
     */
    destroy() {
      if (this.options.scrollTop) this.$element.off('.zf.drilldown', this._bindHandler);
      this._hideAll();
      this.$element.off('mutateme.zf.trigger');
      Foundation.Nest.Burn(this.$element, 'drilldown');
      this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
      this.$submenuAnchors.each(function () {
        $(this).off('.zf.drilldown');
      });

      this.$submenus.removeClass('drilldown-submenu-cover-previous');

      this.$element.find('a').each(function () {
        var $link = $(this);
        $link.removeAttr('tabindex');
        if ($link.data('savedHref')) {
          $link.attr('href', $link.data('savedHref')).removeData('savedHref');
        } else {
          return;
        }
      });
      Foundation.unregisterPlugin(this);
    }
  }

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended  or appended (see backButtonPosition) to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @type {string}
     * @default '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Position the back button either at the top or bottom of drilldown submenus. Can be `'left'` or `'bottom'`.
     * @option
     * @type {string}
     * @default top
     */
    backButtonPosition: 'top',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @type {string}
     * @default '<div></div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @type {boolean}
     * @default false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @type {boolean}
     * @default false
     */
    closeOnClick: false,
    /**
     * Allow the menu to auto adjust height.
     * @option
     * @type {boolean}
     * @default false
     */
    autoHeight: false,
    /**
     * Animate the auto adjust height.
     * @option
     * @type {boolean}
     * @default false
     */
    animateHeight: false,
    /**
     * Scroll to the top of the menu after opening a submenu or navigating back using the menu back button
     * @option
     * @type {boolean}
     * @default false
     */
    scrollTop: false,
    /**
     * String jquery selector (for example 'body') of element to take offset().top from, if empty string the drilldown menu offset().top is taken
     * @option
     * @type {string}
     * @default ''
     */
    scrollTopElement: '',
    /**
     * ScrollTop offset
     * @option
     * @type {number}
     * @default 0
     */
    scrollTopOffset: 0,
    /**
     * Scroll animation duration
     * @option
     * @type {number}
     * @default 500
     */
    animationDuration: 500,
    /**
     * Scroll animation easing. Can be `'swing'` or `'linear'`.
     * @option
     * @type {string}
     * @see {@link https://api.jquery.com/animate|JQuery animate}
     * @default 'swing'
     */
    animationEasing: 'swing'
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  class Dropdown {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */
    _init() {
      var $id = this.$element.attr('id');

      this.$anchor = $(`[data-toggle="${$id}"]`).length ? $(`[data-toggle="${$id}"]`) : $(`[data-open="${$id}"]`);
      this.$anchor.attr({
        'aria-controls': $id,
        'data-is-focus': false,
        'data-yeti-box': $id,
        'aria-haspopup': true,
        'aria-expanded': false

      });

      if (this.options.parentClass) {
        this.$parent = this.$element.parents('.' + this.options.parentClass);
      } else {
        this.$parent = null;
      }
      this.options.positionClass = this.getPositionClass();
      this.counter = 4;
      this.usedPositions = [];
      this.$element.attr({
        'aria-hidden': 'true',
        'data-yeti-box': $id,
        'data-resize': $id,
        'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
      });
      this._events();
    }

    /**
     * Helper function to determine current orientation of dropdown pane.
     * @function
     * @returns {String} position - string value of a position class.
     */
    getPositionClass() {
      var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
      verticalPosition = verticalPosition ? verticalPosition[0] : '';
      var horizontalPosition = /float-(\S+)/.exec(this.$anchor[0].className);
      horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
      var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;

      return position;
    }

    /**
     * Adjusts the dropdown panes orientation by adding/removing positioning classes.
     * @function
     * @private
     * @param {String} position - position class to remove.
     */
    _reposition(position) {
      this.usedPositions.push(position ? position : 'bottom');
      //default, try switching to opposite side
      if (!position && this.usedPositions.indexOf('top') < 0) {
        this.$element.addClass('top');
      } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
        this.$element.removeClass(position);
      } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
        this.$element.removeClass(position).addClass('right');
      } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
        this.$element.removeClass(position).addClass('left');
      }

      //if default change didn't work, try bottom or left first
      else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.$element.addClass('left');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        }
        //if nothing cleared, set to bottom
        else {
            this.$element.removeClass(position);
          }
      this.classChanged = true;
      this.counter--;
    }

    /**
     * Sets the position and orientation of the dropdown pane, checks for collisions.
     * Recursively calls itself if a collision is detected, with a new position class.
     * @function
     * @private
     */
    _setPosition() {
      if (this.$anchor.attr('aria-expanded') === 'false') {
        return false;
      }
      var position = this.getPositionClass(),
          $eleDims = Foundation.Box.GetDimensions(this.$element),
          $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
          _this = this,
          direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
          param = direction === 'top' ? 'height' : 'width',
          offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

      if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element, this.$parent)) {
        var newWidth = $eleDims.windowDims.width,
            parentHOffset = 0;
        if (this.$parent) {
          var $parentDims = Foundation.Box.GetDimensions(this.$parent),
              parentHOffset = $parentDims.offset.left;
          if ($parentDims.width < newWidth) {
            newWidth = $parentDims.width;
          }
        }

        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset + parentHOffset, true)).css({
          'width': newWidth - this.options.hOffset * 2,
          'height': 'auto'
        });
        this.classChanged = true;
        return false;
      }

      this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

      while (!Foundation.Box.ImNotTouchingYou(this.$element, this.$parent, true) && this.counter) {
        this._reposition(position);
        this._setPosition();
      }
    }

    /**
     * Adds event listeners to the element utilizing the triggers utility library.
     * @function
     * @private
     */
    _events() {
      var _this = this;
      this.$element.on({
        'open.zf.trigger': this.open.bind(this),
        'close.zf.trigger': this.close.bind(this),
        'toggle.zf.trigger': this.toggle.bind(this),
        'resizeme.zf.trigger': this._setPosition.bind(this)
      });

      if (this.options.hover) {
        this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
          var bodyData = $('body').data();
          if (typeof bodyData.whatinput === 'undefined' || bodyData.whatinput === 'mouse') {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.open();
              _this.$anchor.data('hover', true);
            }, _this.options.hoverDelay);
          }
        }).on('mouseleave.zf.dropdown', function () {
          clearTimeout(_this.timeout);
          _this.timeout = setTimeout(function () {
            _this.close();
            _this.$anchor.data('hover', false);
          }, _this.options.hoverDelay);
        });
        if (this.options.hoverPane) {
          this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            clearTimeout(_this.timeout);
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
        }
      }
      this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

        var $target = $(this),
            visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

        Foundation.Keyboard.handleKey(e, 'Dropdown', {
          open: function () {
            if ($target.is(_this.$anchor)) {
              _this.open();
              _this.$element.attr('tabindex', -1).focus();
              e.preventDefault();
            }
          },
          close: function () {
            _this.close();
            _this.$anchor.focus();
          }
        });
      });
    }

    /**
     * Adds an event handler to the body to close any dropdowns on a click.
     * @function
     * @private
     */
    _addBodyHandler() {
      var $body = $(document.body).not(this.$element),
          _this = this;
      $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
        if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
          return;
        }
        if (_this.$element.find(e.target).length) {
          return;
        }
        _this.close();
        $body.off('click.zf.dropdown');
      });
    }

    /**
     * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
     * @function
     * @fires Dropdown#closeme
     * @fires Dropdown#show
     */
    open() {
      // var _this = this;
      /**
       * Fires to close other open dropdowns, typically when dropdown is opening
       * @event Dropdown#closeme
       */
      this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
      this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
      // this.$element/*.show()*/;
      this._setPosition();
      this.$element.addClass('is-open').attr({ 'aria-hidden': false });

      if (this.options.autoFocus) {
        var $focusable = Foundation.Keyboard.findFocusable(this.$element);
        if ($focusable.length) {
          $focusable.eq(0).focus();
        }
      }

      if (this.options.closeOnClick) {
        this._addBodyHandler();
      }

      if (this.options.trapFocus) {
        Foundation.Keyboard.trapFocus(this.$element);
      }

      /**
       * Fires once the dropdown is visible.
       * @event Dropdown#show
       */
      this.$element.trigger('show.zf.dropdown', [this.$element]);
    }

    /**
     * Closes the open dropdown pane.
     * @function
     * @fires Dropdown#hide
     */
    close() {
      if (!this.$element.hasClass('is-open')) {
        return false;
      }
      this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

      this.$anchor.removeClass('hover').attr('aria-expanded', false);

      if (this.classChanged) {
        var curPositionClass = this.getPositionClass();
        if (curPositionClass) {
          this.$element.removeClass(curPositionClass);
        }
        this.$element.addClass(this.options.positionClass)
        /*.hide()*/.css({ height: '', width: '' });
        this.classChanged = false;
        this.counter = 4;
        this.usedPositions.length = 0;
      }
      /**
       * Fires once the dropdown is no longer visible.
       * @event Dropdown#hide
       */
      this.$element.trigger('hide.zf.dropdown', [this.$element]);

      if (this.options.trapFocus) {
        Foundation.Keyboard.releaseFocus(this.$element);
      }
    }

    /**
     * Toggles the dropdown pane's visibility.
     * @function
     */
    toggle() {
      if (this.$element.hasClass('is-open')) {
        if (this.$anchor.data('hover')) return;
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * Destroys the dropdown.
     * @function
     */
    destroy() {
      this.$element.off('.zf.trigger').hide();
      this.$anchor.off('.zf.dropdown');

      Foundation.unregisterPlugin(this);
    }
  }

  Dropdown.defaults = {
    /**
     * Class that designates bounding container of Dropdown (default: window)
     * @option
     * @type {?string}
     * @default null
     */
    parentClass: null,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @type {number}
     * @default 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @type {boolean}
     * @default false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @type {boolean}
     * @default false
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @type {number}
     * @default 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @type {number}
     * @default 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @type {string}
     * @default ''
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @type {boolean}
     * @default false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @type {boolean}
     * @default false
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @type {boolean}
     * @default false
     */
    closeOnClick: false

    // Window exports
  };Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  class DropdownMenu {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */
    _init() {
      var subs = this.$element.find('li.is-dropdown-submenu-parent');
      this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

      this.$menuItems = this.$element.find('[role="menuitem"]');
      this.$tabs = this.$element.children('[role="menuitem"]');
      this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

      if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
        this.options.alignment = 'right';
        subs.addClass('opens-left');
      } else {
        subs.addClass('opens-right');
      }
      this.changed = false;
      this._events();
    }

    _isVertical() {
      return this.$tabs.css('display') === 'block';
    }

    /**
     * Adds event listeners to elements within the menu
     * @private
     * @function
     */
    _events() {
      var _this = this,
          hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
          parClass = 'is-dropdown-submenu-parent';

      // used for onClick and in the keyboard handlers
      var handleClickFn = function (e) {
        var $elem = $(e.target).parentsUntil('ul', `.${parClass}`),
            hasSub = $elem.hasClass(parClass),
            hasClicked = $elem.attr('data-is-click') === 'true',
            $sub = $elem.children('.is-dropdown-submenu');

        if (hasSub) {
          if (hasClicked) {
            if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
              return;
            } else {
              e.stopImmediatePropagation();
              e.preventDefault();
              _this._hide($elem);
            }
          } else {
            e.preventDefault();
            e.stopImmediatePropagation();
            _this._show($sub);
            $elem.add($elem.parentsUntil(_this.$element, `.${parClass}`)).attr('data-is-click', true);
          }
        }
      };

      if (this.options.clickOpen || hasTouch) {
        this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
      }

      // Handle Leaf element Clicks
      if (_this.options.closeOnClickInside) {
        this.$menuItems.on('click.zf.dropdownmenu', function (e) {
          var $elem = $(this),
              hasSub = $elem.hasClass(parClass);
          if (!hasSub) {
            _this._hide();
          }
        });
      }

      if (!this.options.disableHover) {
        this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
          var $elem = $(this),
              hasSub = $elem.hasClass(parClass);

          if (hasSub) {
            clearTimeout($elem.data('_delay'));
            $elem.data('_delay', setTimeout(function () {
              _this._show($elem.children('.is-dropdown-submenu'));
            }, _this.options.hoverDelay));
          }
        }).on('mouseleave.zf.dropdownmenu', function (e) {
          var $elem = $(this),
              hasSub = $elem.hasClass(parClass);
          if (hasSub && _this.options.autoclose) {
            if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
              return false;
            }

            clearTimeout($elem.data('_delay'));
            $elem.data('_delay', setTimeout(function () {
              _this._hide($elem);
            }, _this.options.closingTime));
          }
        });
      }
      this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
        var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
            isTab = _this.$tabs.index($element) > -1,
            $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
            $prevElement,
            $nextElement;

        $elements.each(function (i) {
          if ($(this).is($element)) {
            $prevElement = $elements.eq(i - 1);
            $nextElement = $elements.eq(i + 1);
            return;
          }
        });

        var nextSibling = function () {
          if (!$element.is(':last-child')) {
            $nextElement.children('a:first').focus();
            e.preventDefault();
          }
        },
            prevSibling = function () {
          $prevElement.children('a:first').focus();
          e.preventDefault();
        },
            openSub = function () {
          var $sub = $element.children('ul.is-dropdown-submenu');
          if ($sub.length) {
            _this._show($sub);
            $element.find('li > a:first').focus();
            e.preventDefault();
          } else {
            return;
          }
        },
            closeSub = function () {
          //if ($element.is(':first-child')) {
          var close = $element.parent('ul').parent('li');
          close.children('a:first').focus();
          _this._hide(close);
          e.preventDefault();
          //}
        };
        var functions = {
          open: openSub,
          close: function () {
            _this._hide(_this.$element);
            _this.$menuItems.find('a:first').focus(); // focus to first element
            e.preventDefault();
          },
          handled: function () {
            e.stopImmediatePropagation();
          }
        };

        if (isTab) {
          if (_this._isVertical()) {
            // vertical menu
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                down: nextSibling,
                up: prevSibling,
                next: closeSub,
                previous: openSub
              });
            } else {
              // left aligned
              $.extend(functions, {
                down: nextSibling,
                up: prevSibling,
                next: openSub,
                previous: closeSub
              });
            }
          } else {
            // horizontal menu
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                next: prevSibling,
                previous: nextSibling,
                down: openSub,
                up: closeSub
              });
            } else {
              // left aligned
              $.extend(functions, {
                next: nextSibling,
                previous: prevSibling,
                down: openSub,
                up: closeSub
              });
            }
          }
        } else {
          // not tabs -> one sub
          if (Foundation.rtl()) {
            // right aligned
            $.extend(functions, {
              next: closeSub,
              previous: openSub,
              down: nextSibling,
              up: prevSibling
            });
          } else {
            // left aligned
            $.extend(functions, {
              next: openSub,
              previous: closeSub,
              down: nextSibling,
              up: prevSibling
            });
          }
        }
        Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
      });
    }

    /**
     * Adds an event handler to the body to close any dropdowns on a click.
     * @function
     * @private
     */
    _addBodyHandler() {
      var $body = $(document.body),
          _this = this;
      $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
        var $link = _this.$element.find(e.target);
        if ($link.length) {
          return;
        }

        _this._hide();
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
      });
    }

    /**
     * Opens a dropdown pane, and checks for collisions first.
     * @param {jQuery} $sub - ul element that is a submenu to show
     * @function
     * @private
     * @fires DropdownMenu#show
     */
    _show($sub) {
      var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
        return $(el).find($sub).length > 0;
      }));
      var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
      this._hide($sibs, idx);
      $sub.css('visibility', 'hidden').addClass('js-dropdown-active').parent('li.is-dropdown-submenu-parent').addClass('is-active');
      var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
      if (!clear) {
        var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
            $parentLi = $sub.parent('.is-dropdown-submenu-parent');
        $parentLi.removeClass(`opens${oldClass}`).addClass(`opens-${this.options.alignment}`);
        clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          $parentLi.removeClass(`opens-${this.options.alignment}`).addClass('opens-inner');
        }
        this.changed = true;
      }
      $sub.css('visibility', '');
      if (this.options.closeOnClick) {
        this._addBodyHandler();
      }
      /**
       * Fires when the new dropdown pane is visible.
       * @event DropdownMenu#show
       */
      this.$element.trigger('show.zf.dropdownmenu', [$sub]);
    }

    /**
     * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
     * @function
     * @param {jQuery} $elem - element with a submenu to hide
     * @param {Number} idx - index of the $tabs collection to hide
     * @private
     */
    _hide($elem, idx) {
      var $toClose;
      if ($elem && $elem.length) {
        $toClose = $elem;
      } else if (idx !== undefined) {
        $toClose = this.$tabs.not(function (i, el) {
          return i === idx;
        });
      } else {
        $toClose = this.$element;
      }
      var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

      if (somethingToClose) {
        $toClose.find('li.is-active').add($toClose).attr({
          'data-is-click': false
        }).removeClass('is-active');

        $toClose.find('ul.js-dropdown-active').removeClass('js-dropdown-active');

        if (this.changed || $toClose.find('opens-inner').length) {
          var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
          $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass(`opens-inner opens-${this.options.alignment}`).addClass(`opens-${oldClass}`);
          this.changed = false;
        }
        /**
         * Fires when the open menus are closed.
         * @event DropdownMenu#hide
         */
        this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
      }
    }

    /**
     * Destroys the plugin.
     * @function
     */
    destroy() {
      this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
      $(document.body).off('.zf.dropdownmenu');
      Foundation.Nest.Burn(this.$element, 'dropdown');
      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @type {boolean}
     * @default false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @type {boolean}
     * @default true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @type {number}
     * @default 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @type {boolean}
     * @default false
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @type {number}
     * @default 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS. Can be `'left'` or `'right'`.
     * @option
     * @type {string}
     * @default 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,
    /**
     * Allow clicks on leaf anchor links to close any open submenus.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClickInside: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @type {string}
     * @default 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @type {string}
     * @default 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @type {boolean}
     * @default true
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader if equalizer contains images
   */

  class Equalizer {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */
    _init() {
      var eqId = this.$element.attr('data-equalizer') || '';
      var $watched = this.$element.find(`[data-equalizer-watch="${eqId}"]`);

      this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
      this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));
      this.$element.attr('data-mutate', eqId || Foundation.GetYoDigits(6, 'eq'));

      this.hasNested = this.$element.find('[data-equalizer]').length > 0;
      this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
      this.isOn = false;
      this._bindHandler = {
        onResizeMeBound: this._onResizeMe.bind(this),
        onPostEqualizedBound: this._onPostEqualized.bind(this)
      };

      var imgs = this.$element.find('img');
      var tooSmall;
      if (this.options.equalizeOn) {
        tooSmall = this._checkMQ();
        $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
      } else {
        this._events();
      }
      if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
        if (imgs.length) {
          Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
        } else {
          this._reflow();
        }
      }
    }

    /**
     * Removes event listeners if the breakpoint is too small.
     * @private
     */
    _pauseEvents() {
      this.isOn = false;
      this.$element.off({
        '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
        'resizeme.zf.trigger': this._bindHandler.onResizeMeBound,
        'mutateme.zf.trigger': this._bindHandler.onResizeMeBound
      });
    }

    /**
     * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
     * @private
     */
    _onResizeMe(e) {
      this._reflow();
    }

    /**
     * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
     * @private
     */
    _onPostEqualized(e) {
      if (e.target !== this.$element[0]) {
        this._reflow();
      }
    }

    /**
     * Initializes events for Equalizer.
     * @private
     */
    _events() {
      var _this = this;
      this._pauseEvents();
      if (this.hasNested) {
        this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
      } else {
        this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
        this.$element.on('mutateme.zf.trigger', this._bindHandler.onResizeMeBound);
      }
      this.isOn = true;
    }

    /**
     * Checks the current breakpoint to the minimum required size.
     * @private
     */
    _checkMQ() {
      var tooSmall = !Foundation.MediaQuery.is(this.options.equalizeOn);
      if (tooSmall) {
        if (this.isOn) {
          this._pauseEvents();
          this.$watched.css('height', 'auto');
        }
      } else {
        if (!this.isOn) {
          this._events();
        }
      }
      return tooSmall;
    }

    /**
     * A noop version for the plugin
     * @private
     */
    _killswitch() {
      return;
    }

    /**
     * Calls necessary functions to update Equalizer upon DOM change
     * @private
     */
    _reflow() {
      if (!this.options.equalizeOnStack) {
        if (this._isStacked()) {
          this.$watched.css('height', 'auto');
          return false;
        }
      }
      if (this.options.equalizeByRow) {
        this.getHeightsByRow(this.applyHeightByRow.bind(this));
      } else {
        this.getHeights(this.applyHeight.bind(this));
      }
    }

    /**
     * Manually determines if the first 2 elements are *NOT* stacked.
     * @private
     */
    _isStacked() {
      if (!this.$watched[0] || !this.$watched[1]) {
        return true;
      }
      return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
    }

    /**
     * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
     * @param {Function} cb - A non-optional callback to return the heights array to.
     * @returns {Array} heights - An array of heights of children within Equalizer container
     */
    getHeights(cb) {
      var heights = [];
      for (var i = 0, len = this.$watched.length; i < len; i++) {
        this.$watched[i].style.height = 'auto';
        heights.push(this.$watched[i].offsetHeight);
      }
      cb(heights);
    }

    /**
     * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
     * @param {Function} cb - A non-optional callback to return the heights array to.
     * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
     */
    getHeightsByRow(cb) {
      var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
          groups = [],
          group = 0;
      //group by Row
      groups[group] = [];
      for (var i = 0, len = this.$watched.length; i < len; i++) {
        this.$watched[i].style.height = 'auto';
        //maybe could use this.$watched[i].offsetTop
        var elOffsetTop = $(this.$watched[i]).offset().top;
        if (elOffsetTop != lastElTopOffset) {
          group++;
          groups[group] = [];
          lastElTopOffset = elOffsetTop;
        }
        groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
      }

      for (var j = 0, ln = groups.length; j < ln; j++) {
        var heights = $(groups[j]).map(function () {
          return this[1];
        }).get();
        var max = Math.max.apply(null, heights);
        groups[j].push(max);
      }
      cb(groups);
    }

    /**
     * Changes the CSS height property of each child in an Equalizer parent to match the tallest
     * @param {array} heights - An array of heights of children within Equalizer container
     * @fires Equalizer#preequalized
     * @fires Equalizer#postequalized
     */
    applyHeight(heights) {
      var max = Math.max.apply(null, heights);
      /**
       * Fires before the heights are applied
       * @event Equalizer#preequalized
       */
      this.$element.trigger('preequalized.zf.equalizer');

      this.$watched.css('height', max);

      /**
       * Fires when the heights have been applied
       * @event Equalizer#postequalized
       */
      this.$element.trigger('postequalized.zf.equalizer');
    }

    /**
     * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
     * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
     * @fires Equalizer#preequalized
     * @fires Equalizer#preequalizedrow
     * @fires Equalizer#postequalizedrow
     * @fires Equalizer#postequalized
     */
    applyHeightByRow(groups) {
      /**
       * Fires before the heights are applied
       */
      this.$element.trigger('preequalized.zf.equalizer');
      for (var i = 0, len = groups.length; i < len; i++) {
        var groupsILength = groups[i].length,
            max = groups[i][groupsILength - 1];
        if (groupsILength <= 2) {
          $(groups[i][0][0]).css({ 'height': 'auto' });
          continue;
        }
        /**
          * Fires before the heights per row are applied
          * @event Equalizer#preequalizedrow
          */
        this.$element.trigger('preequalizedrow.zf.equalizer');
        for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
          $(groups[i][j][0]).css({ 'height': max });
        }
        /**
          * Fires when the heights per row have been applied
          * @event Equalizer#postequalizedrow
          */
        this.$element.trigger('postequalizedrow.zf.equalizer');
      }
      /**
       * Fires when the heights have been applied
       */
      this.$element.trigger('postequalized.zf.equalizer');
    }

    /**
     * Destroys an instance of Equalizer.
     * @function
     */
    destroy() {
      this._pauseEvents();
      this.$watched.css('height', 'auto');

      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @type {boolean}
     * @default false
     */
    equalizeOnStack: false,
    /**
     * Enable height equalization row by row.
     * @option
     * @type {boolean}
     * @default false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @type {string}
     * @default ''
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  class Interchange {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */
    _init() {
      this._addBreakpoints();
      this._generateRules();
      this._reflow();
    }

    /**
     * Initializes events for Interchange.
     * @function
     * @private
     */
    _events() {
      $(window).on('resize.zf.interchange', Foundation.util.throttle(() => {
        this._reflow();
      }, 50));
    }

    /**
     * Calls necessary functions to update Interchange upon DOM change
     * @function
     * @private
     */
    _reflow() {
      var match;

      // Iterate through each rule, but only save the last match
      for (var i in this.rules) {
        if (this.rules.hasOwnProperty(i)) {
          var rule = this.rules[i];
          if (window.matchMedia(rule.query).matches) {
            match = rule;
          }
        }
      }

      if (match) {
        this.replace(match.path);
      }
    }

    /**
     * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
     * @function
     * @private
     */
    _addBreakpoints() {
      for (var i in Foundation.MediaQuery.queries) {
        if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
          var query = Foundation.MediaQuery.queries[i];
          Interchange.SPECIAL_QUERIES[query.name] = query.value;
        }
      }
    }

    /**
     * Checks the Interchange element for the provided media query + content pairings
     * @function
     * @private
     * @param {Object} element - jQuery object that is an Interchange instance
     * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
     */
    _generateRules(element) {
      var rulesList = [];
      var rules;

      if (this.options.rules) {
        rules = this.options.rules;
      } else {
        rules = this.$element.data('interchange');
      }

      rules = typeof rules === 'string' ? rules.match(/\[.*?\]/g) : rules;

      for (var i in rules) {
        if (rules.hasOwnProperty(i)) {
          var rule = rules[i].slice(1, -1).split(', ');
          var path = rule.slice(0, -1).join('');
          var query = rule[rule.length - 1];

          if (Interchange.SPECIAL_QUERIES[query]) {
            query = Interchange.SPECIAL_QUERIES[query];
          }

          rulesList.push({
            path: path,
            query: query
          });
        }
      }

      this.rules = rulesList;
    }

    /**
     * Update the `src` property of an image, or change the HTML of a container, to the specified path.
     * @function
     * @param {String} path - Path to the image or HTML partial.
     * @fires Interchange#replaced
     */
    replace(path) {
      if (this.currentPath === path) return;

      var _this = this,
          trigger = 'replaced.zf.interchange';

      // Replacing images
      if (this.$element[0].nodeName === 'IMG') {
        this.$element.attr('src', path).on('load', function () {
          _this.currentPath = path;
        }).trigger(trigger);
      }
      // Replacing background images
      else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
          this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
        }
        // Replacing HTML
        else {
            $.get(path, function (response) {
              _this.$element.html(response).trigger(trigger);
              $(response).foundation();
              _this.currentPath = path;
            });
          }

      /**
       * Fires when content in an Interchange element is done being loaded.
       * @event Interchange#replaced
       */
      // this.$element.trigger('replaced.zf.interchange');
    }

    /**
     * Destroys an instance of interchange.
     * @function
     */
    destroy() {
      //TODO this.
    }
  }

  /**
   * Default settings for plugin
   */
  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     * @type {?array}
     * @default null
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  class Magellan {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();
      this.calcPoints();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */
    _init() {
      var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
      var _this = this;
      this.$targets = $('[data-magellan-target]');
      this.$links = this.$element.find('a');
      this.$element.attr({
        'data-resize': id,
        'data-scroll': id,
        'id': id
      });
      this.$active = $();
      this.scrollPos = parseInt(window.pageYOffset, 10);

      this._events();
    }

    /**
     * Calculates an array of pixel values that are the demarcation lines between locations on the page.
     * Can be invoked if new elements are added or the size of a location changes.
     * @function
     */
    calcPoints() {
      var _this = this,
          body = document.body,
          html = document.documentElement;

      this.points = [];
      this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
      this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

      this.$targets.each(function () {
        var $tar = $(this),
            pt = Math.round($tar.offset().top - _this.options.threshold);
        $tar.targetPoint = pt;
        _this.points.push(pt);
      });
    }

    /**
     * Initializes events for Magellan.
     * @private
     */
    _events() {
      var _this = this,
          $body = $('html, body'),
          opts = {
        duration: _this.options.animationDuration,
        easing: _this.options.animationEasing
      };
      $(window).one('load', function () {
        if (_this.options.deepLinking) {
          if (location.hash) {
            _this.scrollToLoc(location.hash);
          }
        }
        _this.calcPoints();
        _this._updateActive();
      });

      this.$element.on({
        'resizeme.zf.trigger': this.reflow.bind(this),
        'scrollme.zf.trigger': this._updateActive.bind(this)
      }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
        e.preventDefault();
        var arrival = this.getAttribute('href');
        _this.scrollToLoc(arrival);
      });
      $(window).on('popstate', function (e) {
        if (_this.options.deepLinking) {
          _this.scrollToLoc(window.location.hash);
        }
      });
    }

    /**
     * Function to scroll to a given location on the page.
     * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
     * @function
     */
    scrollToLoc(loc) {
      // Do nothing if target does not exist to prevent errors
      if (!$(loc).length) {
        return false;
      }
      this._inTransition = true;
      var _this = this,
          scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

      $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing, function () {
        _this._inTransition = false;_this._updateActive();
      });
    }

    /**
     * Calls necessary functions to update Magellan upon DOM change
     * @function
     */
    reflow() {
      this.calcPoints();
      this._updateActive();
    }

    /**
     * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
     * @private
     * @function
     * @fires Magellan#update
     */
    _updateActive() /*evt, elem, scrollPos*/{
      if (this._inTransition) {
        return;
      }
      var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
          curIdx;

      if (winPos + this.winHeight === this.docHeight) {
        curIdx = this.points.length - 1;
      } else if (winPos < this.points[0]) {
        curIdx = undefined;
      } else {
        var isDown = this.scrollPos < winPos,
            _this = this,
            curVisible = this.points.filter(function (p, i) {
          return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
        });
        curIdx = curVisible.length ? curVisible.length - 1 : 0;
      }

      this.$active.removeClass(this.options.activeClass);
      this.$active = this.$links.filter('[href="#' + this.$targets.eq(curIdx).data('magellan-target') + '"]').addClass(this.options.activeClass);

      if (this.options.deepLinking) {
        var hash = "";
        if (curIdx != undefined) {
          hash = this.$active[0].getAttribute('href');
        }
        if (hash !== window.location.hash) {
          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }
      }

      this.scrollPos = winPos;
      /**
       * Fires when magellan is finished updating to the new active element.
       * @event Magellan#update
       */
      this.$element.trigger('update.zf.magellan', [this.$active]);
    }

    /**
     * Destroys an instance of Magellan and resets the url of the window.
     * @function
     */
    destroy() {
      this.$element.off('.zf.trigger .zf.magellan').find(`.${this.options.activeClass}`).removeClass(this.options.activeClass);

      if (this.options.deepLinking) {
        var hash = this.$active[0].getAttribute('href');
        window.location.hash.replace(hash, '');
      }

      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @type {number}
     * @default 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations. Can be `'swing'` or `'linear'`.
     * @option
     * @type {string}
     * @default 'linear'
     * @see {@link https://api.jquery.com/animate|Jquery animate}
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @type {number}
     * @default 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @type {string}
     * @default 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @type {boolean}
     * @default false
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @type {number}
     * @default 0
     */
    barOffset: 0

    // Window exports
  };Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.keyboard
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  class OffCanvas {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */
    _init() {
      var id = this.$element.attr('id');

      this.$element.attr('aria-hidden', 'true');

      this.$element.addClass(`is-transition-${this.options.transition}`);

      // Find triggers that affect this element and add aria-expanded to them
      this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

      // Add an overlay over the content if necessary
      if (this.options.contentOverlay === true) {
        var overlay = document.createElement('div');
        var overlayPosition = $(this.$element).css("position") === 'fixed' ? 'is-overlay-fixed' : 'is-overlay-absolute';
        overlay.setAttribute('class', 'js-off-canvas-overlay ' + overlayPosition);
        this.$overlay = $(overlay);
        if (overlayPosition === 'is-overlay-fixed') {
          $('body').append(this.$overlay);
        } else {
          this.$element.siblings('[data-off-canvas-content]').append(this.$overlay);
        }
      }

      this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

      if (this.options.isRevealed === true) {
        this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
        this._setMQChecker();
      }
      if (!this.options.transitionTime === true) {
        this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas]')[0]).transitionDuration) * 1000;
      }
    }

    /**
     * Adds event handlers to the off-canvas wrapper and the exit overlay.
     * @function
     * @private
     */
    _events() {
      this.$element.off('.zf.trigger .zf.offcanvas').on({
        'open.zf.trigger': this.open.bind(this),
        'close.zf.trigger': this.close.bind(this),
        'toggle.zf.trigger': this.toggle.bind(this),
        'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
      });

      if (this.options.closeOnClick === true) {
        var $target = this.options.contentOverlay ? this.$overlay : $('[data-off-canvas-content]');
        $target.on({ 'click.zf.offcanvas': this.close.bind(this) });
      }
    }

    /**
     * Applies event listener for elements that will reveal at certain breakpoints.
     * @private
     */
    _setMQChecker() {
      var _this = this;

      $(window).on('changed.zf.mediaquery', function () {
        if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
          _this.reveal(true);
        } else {
          _this.reveal(false);
        }
      }).one('load.zf.offcanvas', function () {
        if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
          _this.reveal(true);
        }
      });
    }

    /**
     * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
     * @param {Boolean} isRevealed - true if element should be revealed.
     * @function
     */
    reveal(isRevealed) {
      var $closer = this.$element.find('[data-close]');
      if (isRevealed) {
        this.close();
        this.isRevealed = true;
        this.$element.attr('aria-hidden', 'false');
        this.$element.off('open.zf.trigger toggle.zf.trigger');
        if ($closer.length) {
          $closer.hide();
        }
      } else {
        this.isRevealed = false;
        this.$element.attr('aria-hidden', 'true');
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this)
        });
        if ($closer.length) {
          $closer.show();
        }
      }
    }

    /**
     * Stops scrolling of the body when offcanvas is open on mobile Safari and other troublesome browsers.
     * @private
     */
    _stopScrolling(event) {
      return false;
    }

    // Taken and adapted from http://stackoverflow.com/questions/16889447/prevent-full-page-scrolling-ios
    // Only really works for y, not sure how to extend to x or if we need to.
    _recordScrollable(event) {
      let elem = this; // called from event handler context with this as elem

      // If the element is scrollable (content overflows), then...
      if (elem.scrollHeight !== elem.clientHeight) {
        // If we're at the top, scroll down one pixel to allow scrolling up
        if (elem.scrollTop === 0) {
          elem.scrollTop = 1;
        }
        // If we're at the bottom, scroll up one pixel to allow scrolling down
        if (elem.scrollTop === elem.scrollHeight - elem.clientHeight) {
          elem.scrollTop = elem.scrollHeight - elem.clientHeight - 1;
        }
      }
      elem.allowUp = elem.scrollTop > 0;
      elem.allowDown = elem.scrollTop < elem.scrollHeight - elem.clientHeight;
      elem.lastY = event.originalEvent.pageY;
    }

    _stopScrollPropagation(event) {
      let elem = this; // called from event handler context with this as elem
      let up = event.pageY < elem.lastY;
      let down = !up;
      elem.lastY = event.pageY;

      if (up && elem.allowUp || down && elem.allowDown) {
        event.stopPropagation();
      } else {
        event.preventDefault();
      }
    }

    /**
     * Opens the off-canvas menu.
     * @function
     * @param {Object} event - Event object passed from listener.
     * @param {jQuery} trigger - element that triggered the off-canvas to open.
     * @fires OffCanvas#opened
     */
    open(event, trigger) {
      if (this.$element.hasClass('is-open') || this.isRevealed) {
        return;
      }
      var _this = this;

      if (trigger) {
        this.$lastTrigger = trigger;
      }

      if (this.options.forceTo === 'top') {
        window.scrollTo(0, 0);
      } else if (this.options.forceTo === 'bottom') {
        window.scrollTo(0, document.body.scrollHeight);
      }

      /**
       * Fires when the off-canvas menu opens.
       * @event OffCanvas#opened
       */
      _this.$element.addClass('is-open');

      this.$triggers.attr('aria-expanded', 'true');
      this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

      // If `contentScroll` is set to false, add class and disable scrolling on touch devices.
      if (this.options.contentScroll === false) {
        $('body').addClass('is-off-canvas-open').on('touchmove', this._stopScrolling);
        this.$element.on('touchstart', this._recordScrollable);
        this.$element.on('touchmove', this._stopScrollPropagation);
      }

      if (this.options.contentOverlay === true) {
        this.$overlay.addClass('is-visible');
      }

      if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
        this.$overlay.addClass('is-closable');
      }

      if (this.options.autoFocus === true) {
        this.$element.one(Foundation.transitionend(this.$element), function () {
          _this.$element.find('a, button').eq(0).focus();
        });
      }

      if (this.options.trapFocus === true) {
        this.$element.siblings('[data-off-canvas-content]').attr('tabindex', '-1');
        Foundation.Keyboard.trapFocus(this.$element);
      }
    }

    /**
     * Closes the off-canvas menu.
     * @function
     * @param {Function} cb - optional cb to fire after closure.
     * @fires OffCanvas#closed
     */
    close(cb) {
      if (!this.$element.hasClass('is-open') || this.isRevealed) {
        return;
      }

      var _this = this;

      _this.$element.removeClass('is-open');

      this.$element.attr('aria-hidden', 'true')
      /**
       * Fires when the off-canvas menu opens.
       * @event OffCanvas#closed
       */
      .trigger('closed.zf.offcanvas');

      // If `contentScroll` is set to false, remove class and re-enable scrolling on touch devices.
      if (this.options.contentScroll === false) {
        $('body').removeClass('is-off-canvas-open').off('touchmove', this._stopScrolling);
        this.$element.off('touchstart', this._recordScrollable);
        this.$element.off('touchmove', this._stopScrollPropagation);
      }

      if (this.options.contentOverlay === true) {
        this.$overlay.removeClass('is-visible');
      }

      if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
        this.$overlay.removeClass('is-closable');
      }

      this.$triggers.attr('aria-expanded', 'false');

      if (this.options.trapFocus === true) {
        this.$element.siblings('[data-off-canvas-content]').removeAttr('tabindex');
        Foundation.Keyboard.releaseFocus(this.$element);
      }
    }

    /**
     * Toggles the off-canvas menu open or closed.
     * @function
     * @param {Object} event - Event object passed from listener.
     * @param {jQuery} trigger - element that triggered the off-canvas to open.
     */
    toggle(event, trigger) {
      if (this.$element.hasClass('is-open')) {
        this.close(event, trigger);
      } else {
        this.open(event, trigger);
      }
    }

    /**
     * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
     * @function
     * @private
     */
    _handleKeyboard(e) {
      Foundation.Keyboard.handleKey(e, 'OffCanvas', {
        close: () => {
          this.close();
          this.$lastTrigger.focus();
          return true;
        },
        handled: () => {
          e.stopPropagation();
          e.preventDefault();
        }
      });
    }

    /**
     * Destroys the offcanvas plugin.
     * @function
     */
    destroy() {
      this.close();
      this.$element.off('.zf.trigger .zf.offcanvas');
      this.$overlay.off('.zf.offcanvas');

      Foundation.unregisterPlugin(this);
    }
  }

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,

    /**
     * Adds an overlay on top of `[data-off-canvas-content]`.
     * @option
     * @type {boolean}
     * @default true
     */
    contentOverlay: true,

    /**
     * Enable/disable scrolling of the main content when an off canvas panel is open.
     * @option
     * @type {boolean}
     * @default true
     */
    contentScroll: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @type {number}
     * @default 0
     */
    transitionTime: 0,

    /**
     * Type of transition for the offcanvas menu. Options are 'push', 'detached' or 'slide'.
     * @option
     * @type {string}
     * @default push
     */
    transition: 'push',

    /**
     * Force the page to scroll to top or bottom on open.
     * @option
     * @type {?string}
     * @default null
     */
    forceTo: null,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @type {boolean}
     * @default false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @type {?string}
     * @default null
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @type {boolean}
     * @default true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * @type {string}
     * @default reveal-for-
     * @todo improve the regex testing for this.
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @type {boolean}
     * @default false
     */
    trapFocus: false

    // Window exports
  };Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  class Orbit {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */
    _init() {
      // @TODO: consider discussion on PR #9278 about DOM pollution by changeSlide
      this._reset();

      this.$wrapper = this.$element.find(`.${this.options.containerClass}`);
      this.$slides = this.$element.find(`.${this.options.slideClass}`);

      var $images = this.$element.find('img'),
          initActive = this.$slides.filter('.is-active'),
          id = this.$element[0].id || Foundation.GetYoDigits(6, 'orbit');

      this.$element.attr({
        'data-resize': id,
        'id': id
      });

      if (!initActive.length) {
        this.$slides.eq(0).addClass('is-active');
      }

      if (!this.options.useMUI) {
        this.$slides.addClass('no-motionui');
      }

      if ($images.length) {
        Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
      } else {
        this._prepareForOrbit(); //hehe
      }

      if (this.options.bullets) {
        this._loadBullets();
      }

      this._events();

      if (this.options.autoPlay && this.$slides.length > 1) {
        this.geoSync();
      }

      if (this.options.accessible) {
        // allow wrapper to be focusable to enable arrow navigation
        this.$wrapper.attr('tabindex', 0);
      }
    }

    /**
    * Creates a jQuery collection of bullets, if they are being used.
    * @function
    * @private
    */
    _loadBullets() {
      this.$bullets = this.$element.find(`.${this.options.boxOfBullets}`).find('button');
    }

    /**
    * Sets a `timer` object on the orbit, and starts the counter for the next slide.
    * @function
    */
    geoSync() {
      var _this = this;
      this.timer = new Foundation.Timer(this.$element, {
        duration: this.options.timerDelay,
        infinite: false
      }, function () {
        _this.changeSlide(true);
      });
      this.timer.start();
    }

    /**
    * Sets wrapper and slide heights for the orbit.
    * @function
    * @private
    */
    _prepareForOrbit() {
      var _this = this;
      this._setWrapperHeight();
    }

    /**
    * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
    * @function
    * @private
    * @param {Function} cb - a callback function to fire when complete.
    */
    _setWrapperHeight(cb) {
      //rewrite this to `for` loop
      var max = 0,
          temp,
          counter = 0,
          _this = this;

      this.$slides.each(function () {
        temp = this.getBoundingClientRect().height;
        $(this).attr('data-slide', counter);

        if (_this.$slides.filter('.is-active')[0] !== _this.$slides.eq(counter)[0]) {
          //if not the active slide, set css position and display property
          $(this).css({ 'position': 'relative', 'display': 'none' });
        }
        max = temp > max ? temp : max;
        counter++;
      });

      if (counter === this.$slides.length) {
        this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
        if (cb) {
          cb(max);
        } //fire callback with max height dimension.
      }
    }

    /**
    * Sets the max-height of each slide.
    * @function
    * @private
    */
    _setSlideHeight(height) {
      this.$slides.each(function () {
        $(this).css('max-height', height);
      });
    }

    /**
    * Adds event listeners to basically everything within the element.
    * @function
    * @private
    */
    _events() {
      var _this = this;

      //***************************************
      //**Now using custom event - thanks to:**
      //**      Yohai Ararat of Toronto      **
      //***************************************
      //
      this.$element.off('.resizeme.zf.trigger').on({
        'resizeme.zf.trigger': this._prepareForOrbit.bind(this)
      });
      if (this.$slides.length > 1) {

        if (this.options.swipe) {
          this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
            e.preventDefault();
            _this.changeSlide(true);
          }).on('swiperight.zf.orbit', function (e) {
            e.preventDefault();
            _this.changeSlide(false);
          });
        }
        //***************************************

        if (this.options.autoPlay) {
          this.$slides.on('click.zf.orbit', function () {
            _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
            _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
          });

          if (this.options.pauseOnHover) {
            this.$element.on('mouseenter.zf.orbit', function () {
              _this.timer.pause();
            }).on('mouseleave.zf.orbit', function () {
              if (!_this.$element.data('clickedOn')) {
                _this.timer.start();
              }
            });
          }
        }

        if (this.options.navButtons) {
          var $controls = this.$element.find(`.${this.options.nextClass}, .${this.options.prevClass}`);
          $controls.attr('tabindex', 0)
          //also need to handle enter/return and spacebar key presses
          .on('click.zf.orbit touchend.zf.orbit', function (e) {
            e.preventDefault();
            _this.changeSlide($(this).hasClass(_this.options.nextClass));
          });
        }

        if (this.options.bullets) {
          this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
            if (/is-active/g.test(this.className)) {
              return false;
            } //if this is active, kick out of function.
            var idx = $(this).data('slide'),
                ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                $slide = _this.$slides.eq(idx);

            _this.changeSlide(ltr, $slide, idx);
          });
        }

        if (this.options.accessible) {
          this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
            // handle keyboard event with keyboard util
            Foundation.Keyboard.handleKey(e, 'Orbit', {
              next: function () {
                _this.changeSlide(true);
              },
              previous: function () {
                _this.changeSlide(false);
              },
              handled: function () {
                // if bullet is focused, make sure focus moves
                if ($(e.target).is(_this.$bullets)) {
                  _this.$bullets.filter('.is-active').focus();
                }
              }
            });
          });
        }
      }
    }

    /**
     * Resets Orbit so it can be reinitialized
     */
    _reset() {
      // Don't do anything if there are no slides (first run)
      if (typeof this.$slides == 'undefined') {
        return;
      }

      if (this.$slides.length > 1) {
        // Remove old events
        this.$element.off('.zf.orbit').find('*').off('.zf.orbit');

        // Restart timer if autoPlay is enabled
        if (this.options.autoPlay) {
          this.timer.restart();
        }

        // Reset all sliddes
        this.$slides.each(function (el) {
          $(el).removeClass('is-active is-active is-in').removeAttr('aria-live').hide();
        });

        // Show the first slide
        this.$slides.first().addClass('is-active').show();

        // Triggers when the slide has finished animating
        this.$element.trigger('slidechange.zf.orbit', [this.$slides.first()]);

        // Select first bullet if bullets are present
        if (this.options.bullets) {
          this._updateBullets(0);
        }
      }
    }

    /**
    * Changes the current slide to a new one.
    * @function
    * @param {Boolean} isLTR - flag if the slide should move left to right.
    * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
    * @param {Number} idx - the index of the new slide in its collection, if one chosen.
    * @fires Orbit#slidechange
    */
    changeSlide(isLTR, chosenSlide, idx) {
      if (!this.$slides) {
        return;
      } // Don't freak out if we're in the middle of cleanup
      var $curSlide = this.$slides.filter('.is-active').eq(0);

      if (/mui/g.test($curSlide[0].className)) {
        return false;
      } //if the slide is currently animating, kick out of the function

      var $firstSlide = this.$slides.first(),
          $lastSlide = this.$slides.last(),
          dirIn = isLTR ? 'Right' : 'Left',
          dirOut = isLTR ? 'Left' : 'Right',
          _this = this,
          $newSlide;

      if (!chosenSlide) {
        //most of the time, this will be auto played or clicked from the navButtons.
        $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
        this.options.infiniteWrap ? $curSlide.next(`.${this.options.slideClass}`).length ? $curSlide.next(`.${this.options.slideClass}`) : $firstSlide : $curSlide.next(`.${this.options.slideClass}`) : //pick next slide if moving left to right
        this.options.infiniteWrap ? $curSlide.prev(`.${this.options.slideClass}`).length ? $curSlide.prev(`.${this.options.slideClass}`) : $lastSlide : $curSlide.prev(`.${this.options.slideClass}`); //pick prev slide if moving right to left
      } else {
        $newSlide = chosenSlide;
      }

      if ($newSlide.length) {
        /**
        * Triggers before the next slide starts animating in and only if a next slide has been found.
        * @event Orbit#beforeslidechange
        */
        this.$element.trigger('beforeslidechange.zf.orbit', [$curSlide, $newSlide]);

        if (this.options.bullets) {
          idx = idx || this.$slides.index($newSlide); //grab index to update bullets
          this._updateBullets(idx);
        }

        if (this.options.useMUI && !this.$element.is(':hidden')) {
          Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options[`animInFrom${dirIn}`], function () {
            $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
          });

          Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options[`animOutTo${dirOut}`], function () {
            $curSlide.removeAttr('aria-live');
            if (_this.options.autoPlay && !_this.timer.isPaused) {
              _this.timer.restart();
            }
            //do stuff?
          });
        } else {
          $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
          $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
          if (this.options.autoPlay && !this.timer.isPaused) {
            this.timer.restart();
          }
        }
        /**
        * Triggers when the slide has finished animating in.
        * @event Orbit#slidechange
        */
        this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
      }
    }

    /**
    * Updates the active state of the bullets, if displayed.
    * @function
    * @private
    * @param {Number} idx - the index of the current slide.
    */
    _updateBullets(idx) {
      var $oldBullet = this.$element.find(`.${this.options.boxOfBullets}`).find('.is-active').removeClass('is-active').blur(),
          span = $oldBullet.find('span:last').detach(),
          $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
    }

    /**
    * Destroys the carousel and hides the element.
    * @function
    */
    destroy() {
      this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
      Foundation.unregisterPlugin(this);
    }
  }

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
     * @type {boolean}
    * @default true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
     * @type {boolean}
    * @default true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
     * @type {string}
    * @default 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
     * @type {boolean}
    * @default true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
     * @type {number}
    * @default 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
     * @type {boolean}
    * @default true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
     * @type {boolean}
    * @default true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
     * @type {boolean}
    * @default true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
     * @type {boolean}
    * @default true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
     * @type {string}
    * @default 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
     * @type {string}
    * @default 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
     * @type {string}
    * @default 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
     * @type {string}
    * @default 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
     * @type {string}
    * @default 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
     * @type {boolean}
    * @default true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  class ResponsiveMenu {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */
    _init() {
      // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
      if (typeof this.rules === 'string') {
        let rulesTree = {};

        // Parse rules from "classes" pulled from data attribute
        let rules = this.rules.split(' ');

        // Iterate through every rule found
        for (let i = 0; i < rules.length; i++) {
          let rule = rules[i].split('-');
          let ruleSize = rule.length > 1 ? rule[0] : 'small';
          let rulePlugin = rule.length > 1 ? rule[1] : rule[0];

          if (MenuPlugins[rulePlugin] !== null) {
            rulesTree[ruleSize] = MenuPlugins[rulePlugin];
          }
        }

        this.rules = rulesTree;
      }

      if (!$.isEmptyObject(this.rules)) {
        this._checkMediaQueries();
      }
      // Add data-mutate since children may need it.
      this.$element.attr('data-mutate', this.$element.attr('data-mutate') || Foundation.GetYoDigits(6, 'responsive-menu'));
    }

    /**
     * Initializes events for the Menu.
     * @function
     * @private
     */
    _events() {
      var _this = this;

      $(window).on('changed.zf.mediaquery', function () {
        _this._checkMediaQueries();
      });
      // $(window).on('resize.zf.ResponsiveMenu', function() {
      //   _this._checkMediaQueries();
      // });
    }

    /**
     * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
     * @function
     * @private
     */
    _checkMediaQueries() {
      var matchedMq,
          _this = this;
      // Iterate through each rule and find the last matching rule
      $.each(this.rules, function (key) {
        if (Foundation.MediaQuery.atLeast(key)) {
          matchedMq = key;
        }
      });

      // No match? No dice
      if (!matchedMq) return;

      // Plugin already initialized? We good
      if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

      // Remove existing plugin-specific CSS classes
      $.each(MenuPlugins, function (key, value) {
        _this.$element.removeClass(value.cssClass);
      });

      // Add the CSS class for the new plugin
      this.$element.addClass(this.rules[matchedMq].cssClass);

      // Create an instance of the new plugin
      if (this.currentPlugin) this.currentPlugin.destroy();
      this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
    }

    /**
     * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
     * @function
     */
    destroy() {
      this.currentPlugin.destroy();
      $(window).off('.zf.ResponsiveMenu');
      Foundation.unregisterPlugin(this);
    }
  }

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  class ResponsiveToggle {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */
    _init() {
      var targetID = this.$element.data('responsive-toggle');
      if (!targetID) {
        console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
      }

      this.$targetMenu = $(`#${targetID}`);
      this.$toggler = this.$element.find('[data-toggle]').filter(function () {
        var target = $(this).data('toggle');
        return target === targetID || target === "";
      });
      this.options = $.extend({}, this.options, this.$targetMenu.data());

      // If they were set, parse the animation classes
      if (this.options.animate) {
        let input = this.options.animate.split(' ');

        this.animationIn = input[0];
        this.animationOut = input[1] || null;
      }

      this._update();
    }

    /**
     * Adds necessary event handlers for the tab bar to work.
     * @function
     * @private
     */
    _events() {
      var _this = this;

      this._updateMqHandler = this._update.bind(this);

      $(window).on('changed.zf.mediaquery', this._updateMqHandler);

      this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
    }

    /**
     * Checks the current media query to determine if the tab bar should be visible or hidden.
     * @function
     * @private
     */
    _update() {
      // Mobile
      if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
        this.$element.show();
        this.$targetMenu.hide();
      }

      // Desktop
      else {
          this.$element.hide();
          this.$targetMenu.show();
        }
    }

    /**
     * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
     * @function
     * @fires ResponsiveToggle#toggled
     */
    toggleMenu() {
      if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
        /**
         * Fires when the element attached to the tab bar toggles.
         * @event ResponsiveToggle#toggled
         */
        if (this.options.animate) {
          if (this.$targetMenu.is(':hidden')) {
            Foundation.Motion.animateIn(this.$targetMenu, this.animationIn, () => {
              this.$element.trigger('toggled.zf.responsiveToggle');
              this.$targetMenu.find('[data-mutate]').triggerHandler('mutateme.zf.trigger');
            });
          } else {
            Foundation.Motion.animateOut(this.$targetMenu, this.animationOut, () => {
              this.$element.trigger('toggled.zf.responsiveToggle');
            });
          }
        } else {
          this.$targetMenu.toggle(0);
          this.$targetMenu.find('[data-mutate]').trigger('mutateme.zf.trigger');
          this.$element.trigger('toggled.zf.responsiveToggle');
        }
      }
    }

    destroy() {
      this.$element.off('.zf.responsiveToggle');
      this.$toggler.off('.zf.responsiveToggle');

      $(window).off('changed.zf.mediaquery', this._updateMqHandler);

      Foundation.unregisterPlugin(this);
    }
  }

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @type {string}
     * @default 'medium'
     */
    hideFor: 'medium',

    /**
     * To decide if the toggle should be animated or not.
     * @option
     * @type {boolean}
     * @default false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  class Reveal {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */
    _init() {
      this.id = this.$element.attr('id');
      this.isActive = false;
      this.cached = { mq: Foundation.MediaQuery.current };
      this.isMobile = mobileSniff();

      this.$anchor = $(`[data-open="${this.id}"]`).length ? $(`[data-open="${this.id}"]`) : $(`[data-toggle="${this.id}"]`);
      this.$anchor.attr({
        'aria-controls': this.id,
        'aria-haspopup': true,
        'tabindex': 0
      });

      if (this.options.fullScreen || this.$element.hasClass('full')) {
        this.options.fullScreen = true;
        this.options.overlay = false;
      }
      if (this.options.overlay && !this.$overlay) {
        this.$overlay = this._makeOverlay(this.id);
      }

      this.$element.attr({
        'role': 'dialog',
        'aria-hidden': true,
        'data-yeti-box': this.id,
        'data-resize': this.id
      });

      if (this.$overlay) {
        this.$element.detach().appendTo(this.$overlay);
      } else {
        this.$element.detach().appendTo($(this.options.appendTo));
        this.$element.addClass('without-overlay');
      }
      this._events();
      if (this.options.deepLink && window.location.hash === `#${this.id}`) {
        $(window).one('load.zf.reveal', this.open.bind(this));
      }
    }

    /**
     * Creates an overlay div to display behind the modal.
     * @private
     */
    _makeOverlay() {
      return $('<div></div>').addClass('reveal-overlay').appendTo(this.options.appendTo);
    }

    /**
     * Updates position of modal
     * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
     * @private
     */
    _updatePosition() {
      var width = this.$element.outerWidth();
      var outerWidth = $(window).width();
      var height = this.$element.outerHeight();
      var outerHeight = $(window).height();
      var left, top;
      if (this.options.hOffset === 'auto') {
        left = parseInt((outerWidth - width) / 2, 10);
      } else {
        left = parseInt(this.options.hOffset, 10);
      }
      if (this.options.vOffset === 'auto') {
        if (height > outerHeight) {
          top = parseInt(Math.min(100, outerHeight / 10), 10);
        } else {
          top = parseInt((outerHeight - height) / 4, 10);
        }
      } else {
        top = parseInt(this.options.vOffset, 10);
      }
      this.$element.css({ top: top + 'px' });
      // only worry about left if we don't have an overlay or we havea  horizontal offset,
      // otherwise we're perfectly in the middle
      if (!this.$overlay || this.options.hOffset !== 'auto') {
        this.$element.css({ left: left + 'px' });
        this.$element.css({ margin: '0px' });
      }
    }

    /**
     * Adds event handlers for the modal.
     * @private
     */
    _events() {
      var _this = this;

      this.$element.on({
        'open.zf.trigger': this.open.bind(this),
        'close.zf.trigger': (event, $element) => {
          if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
            // only close reveal when it's explicitly called
            return this.close.apply(this);
          }
        },
        'toggle.zf.trigger': this.toggle.bind(this),
        'resizeme.zf.trigger': function () {
          _this._updatePosition();
        }
      });

      if (this.$anchor.length) {
        this.$anchor.on('keydown.zf.reveal', function (e) {
          if (e.which === 13 || e.which === 32) {
            e.stopPropagation();
            e.preventDefault();
            _this.open();
          }
        });
      }

      if (this.options.closeOnClick && this.options.overlay) {
        this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
          if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
            return;
          }
          _this.close();
        });
      }
      if (this.options.deepLink) {
        $(window).on(`popstate.zf.reveal:${this.id}`, this._handleState.bind(this));
      }
    }

    /**
     * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
     * @private
     */
    _handleState(e) {
      if (window.location.hash === '#' + this.id && !this.isActive) {
        this.open();
      } else {
        this.close();
      }
    }

    /**
     * Opens the modal controlled by `this.$anchor`, and closes all others by default.
     * @function
     * @fires Reveal#closeme
     * @fires Reveal#open
     */
    open() {
      if (this.options.deepLink) {
        var hash = `#${this.id}`;

        if (window.history.pushState) {
          window.history.pushState(null, null, hash);
        } else {
          window.location.hash = hash;
        }
      }

      this.isActive = true;

      // Make elements invisible, but remove display: none so we can get size and positioning
      this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
      if (this.options.overlay) {
        this.$overlay.css({ 'visibility': 'hidden' }).show();
      }

      this._updatePosition();

      this.$element.hide().css({ 'visibility': '' });

      if (this.$overlay) {
        this.$overlay.css({ 'visibility': '' }).hide();
        if (this.$element.hasClass('fast')) {
          this.$overlay.addClass('fast');
        } else if (this.$element.hasClass('slow')) {
          this.$overlay.addClass('slow');
        }
      }

      if (!this.options.multipleOpened) {
        /**
         * Fires immediately before the modal opens.
         * Closes any other modals that are currently open
         * @event Reveal#closeme
         */
        this.$element.trigger('closeme.zf.reveal', this.id);
      }

      var _this = this;

      function addRevealOpenClasses() {
        if (_this.isMobile) {
          if (!_this.originalScrollPos) {
            _this.originalScrollPos = window.pageYOffset;
          }
          $('html, body').addClass('is-reveal-open');
        } else {
          $('body').addClass('is-reveal-open');
        }
      }
      // Motion UI method of reveal
      if (this.options.animationIn) {
        function afterAnimation() {
          _this.$element.attr({
            'aria-hidden': false,
            'tabindex': -1
          }).focus();
          addRevealOpenClasses();
          Foundation.Keyboard.trapFocus(_this.$element);
        }
        if (this.options.overlay) {
          Foundation.Motion.animateIn(this.$overlay, 'fade-in');
        }
        Foundation.Motion.animateIn(this.$element, this.options.animationIn, () => {
          if (this.$element) {
            // protect against object having been removed
            this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);
            afterAnimation();
          }
        });
      }
      // jQuery method of reveal
      else {
          if (this.options.overlay) {
            this.$overlay.show(0);
          }
          this.$element.show(this.options.showDelay);
        }

      // handle accessibility
      this.$element.attr({
        'aria-hidden': false,
        'tabindex': -1
      }).focus();
      Foundation.Keyboard.trapFocus(this.$element);

      /**
       * Fires when the modal has successfully opened.
       * @event Reveal#open
       */
      this.$element.trigger('open.zf.reveal');

      addRevealOpenClasses();

      setTimeout(() => {
        this._extraHandlers();
      }, 0);
    }

    /**
     * Adds extra event handlers for the body and window if necessary.
     * @private
     */
    _extraHandlers() {
      var _this = this;
      if (!this.$element) {
        return;
      } // If we're in the middle of cleanup, don't freak out
      this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

      if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
        $('body').on('click.zf.reveal', function (e) {
          if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
            return;
          }
          _this.close();
        });
      }

      if (this.options.closeOnEsc) {
        $(window).on('keydown.zf.reveal', function (e) {
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            }
          });
        });
      }

      // lock focus within modal while tabbing
      this.$element.on('keydown.zf.reveal', function (e) {
        var $target = $(this);
        // handle keyboard event with keyboard util
        Foundation.Keyboard.handleKey(e, 'Reveal', {
          open: function () {
            if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
              setTimeout(function () {
                // set focus back to anchor if close button has been activated
                _this.$anchor.focus();
              }, 1);
            } else if ($target.is(_this.focusableElements)) {
              // dont't trigger if acual element has focus (i.e. inputs, links, ...)
              _this.open();
            }
          },
          close: function () {
            if (_this.options.closeOnEsc) {
              _this.close();
              _this.$anchor.focus();
            }
          },
          handled: function (preventDefault) {
            if (preventDefault) {
              e.preventDefault();
            }
          }
        });
      });
    }

    /**
     * Closes the modal.
     * @function
     * @fires Reveal#closed
     */
    close() {
      if (!this.isActive || !this.$element.is(':visible')) {
        return false;
      }
      var _this = this;

      // Motion UI method of hiding
      if (this.options.animationOut) {
        if (this.options.overlay) {
          Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
        } else {
          finishUp();
        }

        Foundation.Motion.animateOut(this.$element, this.options.animationOut);
      }
      // jQuery method of hiding
      else {
          if (this.options.overlay) {
            this.$overlay.hide(0, finishUp);
          } else {
            finishUp();
          }

          this.$element.hide(this.options.hideDelay);
        }

      // Conditionals to remove extra event listeners added on open
      if (this.options.closeOnEsc) {
        $(window).off('keydown.zf.reveal');
      }

      if (!this.options.overlay && this.options.closeOnClick) {
        $('body').off('click.zf.reveal');
      }

      this.$element.off('keydown.zf.reveal');

      function finishUp() {
        if (_this.isMobile) {
          $('html, body').removeClass('is-reveal-open');
          if (_this.originalScrollPos) {
            $('body').scrollTop(_this.originalScrollPos);
            _this.originalScrollPos = null;
          }
        } else {
          $('body').removeClass('is-reveal-open');
        }

        Foundation.Keyboard.releaseFocus(_this.$element);

        _this.$element.attr('aria-hidden', true);

        /**
        * Fires when the modal is done closing.
        * @event Reveal#closed
        */
        _this.$element.trigger('closed.zf.reveal');
      }

      /**
      * Resets the modal content
      * This prevents a running video to keep going in the background
      */
      if (this.options.resetOnClose) {
        this.$element.html(this.$element.html());
      }

      this.isActive = false;
      if (_this.options.deepLink) {
        if (window.history.replaceState) {
          window.history.replaceState('', document.title, window.location.href.replace(`#${this.id}`, ''));
        } else {
          window.location.hash = '';
        }
      }
    }

    /**
     * Toggles the open/closed state of a modal.
     * @function
     */
    toggle() {
      if (this.isActive) {
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * Destroys an instance of a modal.
     * @function
     */
    destroy() {
      if (this.options.overlay) {
        this.$element.appendTo($(this.options.appendTo)); // move $element outside of $overlay to prevent error unregisterPlugin()
        this.$overlay.hide().off().remove();
      }
      this.$element.hide().off();
      this.$anchor.off('.zf');
      $(window).off(`.zf.reveal:${this.id}`);

      Foundation.unregisterPlugin(this);
    }
  }

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @type {string}
     * @default ''
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @type {string}
     * @default ''
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @type {number}
     * @default 0
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @type {number}
     * @default 0
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @type {boolean}
     * @default true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @type {boolean}
     * @default false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @type {number|string}
     * @default auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @type {number|string}
     * @default auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @type {boolean}
     * @default false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @type {number}
     * @default 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @type {boolean}
     * @default true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @type {boolean}
     * @default false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @type {boolean}
     * @default false
     */
    deepLink: false,
    /**
    * Allows the modal to append to custom div.
    * @option
    * @type {string}
    * @default "body"
    */
    appendTo: "body"

  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  class Slider {
    /**
     * Creates a new instance of a slider control.
     * @class
     * @param {jQuery} element - jQuery object to make into a slider control.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */
    _init() {
      this.inputs = this.$element.find('input');
      this.handles = this.$element.find('[data-slider-handle]');

      this.$handle = this.handles.eq(0);
      this.$input = this.inputs.length ? this.inputs.eq(0) : $(`#${this.$handle.attr('aria-controls')}`);
      this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

      var isDbl = false,
          _this = this;
      if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
        this.options.disabled = true;
        this.$element.addClass(this.options.disabledClass);
      }
      if (!this.inputs.length) {
        this.inputs = $().add(this.$input);
        this.options.binding = true;
      }

      this._setInitAttr(0);

      if (this.handles[1]) {
        this.options.doubleSided = true;
        this.$handle2 = this.handles.eq(1);
        this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $(`#${this.$handle2.attr('aria-controls')}`);

        if (!this.inputs[1]) {
          this.inputs = this.inputs.add(this.$input2);
        }
        isDbl = true;

        // this.$handle.triggerHandler('click.zf.slider');
        this._setInitAttr(1);
      }

      // Set handle positions
      this.setHandles();

      this._events();
    }

    setHandles() {
      if (this.handles[1]) {
        this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true, () => {
          this._setHandlePos(this.$handle2, this.inputs.eq(1).val(), true);
        });
      } else {
        this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true);
      }
    }

    _reflow() {
      this.setHandles();
    }
    /**
    * @function
    * @private
    * @param {Number} value - floating point (the value) to be transformed using to a relative position on the slider (the inverse of _value)
    */
    _pctOfBar(value) {
      var pctOfBar = percent(value - this.options.start, this.options.end - this.options.start);

      switch (this.options.positionValueFunction) {
        case "pow":
          pctOfBar = this._logTransform(pctOfBar);
          break;
        case "log":
          pctOfBar = this._powTransform(pctOfBar);
          break;
      }

      return pctOfBar.toFixed(2);
    }

    /**
    * @function
    * @private
    * @param {Number} pctOfBar - floating point, the relative position of the slider (typically between 0-1) to be transformed to a value
    */
    _value(pctOfBar) {
      switch (this.options.positionValueFunction) {
        case "pow":
          pctOfBar = this._powTransform(pctOfBar);
          break;
        case "log":
          pctOfBar = this._logTransform(pctOfBar);
          break;
      }
      var value = (this.options.end - this.options.start) * pctOfBar + this.options.start;

      return value;
    }

    /**
    * @function
    * @private
    * @param {Number} value - floating point (typically between 0-1) to be transformed using the log function
    */
    _logTransform(value) {
      return baseLog(this.options.nonLinearBase, value * (this.options.nonLinearBase - 1) + 1);
    }

    /**
    * @function
    * @private
    * @param {Number} value - floating point (typically between 0-1) to be transformed using the power function
    */
    _powTransform(value) {
      return (Math.pow(this.options.nonLinearBase, value) - 1) / (this.options.nonLinearBase - 1);
    }

    /**
     * Sets the position of the selected handle and fill bar.
     * @function
     * @private
     * @param {jQuery} $hndl - the selected handle to move.
     * @param {Number} location - floating point between the start and end values of the slider bar.
     * @param {Function} cb - callback function to fire on completion.
     * @fires Slider#moved
     * @fires Slider#changed
     */
    _setHandlePos($hndl, location, noInvert, cb) {
      // don't move if the slider has been disabled since its initialization
      if (this.$element.hasClass(this.options.disabledClass)) {
        return;
      }
      //might need to alter that slightly for bars that will have odd number selections.
      location = parseFloat(location); //on input change events, convert string to number...grumble.

      // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
      if (location < this.options.start) {
        location = this.options.start;
      } else if (location > this.options.end) {
        location = this.options.end;
      }

      var isDbl = this.options.doubleSided;

      if (isDbl) {
        //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
        if (this.handles.index($hndl) === 0) {
          var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
          location = location >= h2Val ? h2Val - this.options.step : location;
        } else {
          var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
          location = location <= h1Val ? h1Val + this.options.step : location;
        }
      }

      //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
      //for click and drag events, it's weird due to the scale(-1, 1) css property
      if (this.options.vertical && !noInvert) {
        location = this.options.end - location;
      }

      var _this = this,
          vert = this.options.vertical,
          hOrW = vert ? 'height' : 'width',
          lOrT = vert ? 'top' : 'left',
          handleDim = $hndl[0].getBoundingClientRect()[hOrW],
          elemDim = this.$element[0].getBoundingClientRect()[hOrW],

      //percentage of bar min/max value based on click or drag point
      pctOfBar = this._pctOfBar(location),

      //number of actual pixels to shift the handle, based on the percentage obtained above
      pxToMove = (elemDim - handleDim) * pctOfBar,

      //percentage of bar to shift the handle
      movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
      //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
      location = parseFloat(location.toFixed(this.options.decimal));
      // declare empty object for css adjustments, only used with 2 handled-sliders
      var css = {};

      this._setValues($hndl, location);

      // TODO update to calculate based on values set to respective inputs??
      if (isDbl) {
        var isLeftHndl = this.handles.index($hndl) === 0,

        //empty variable, will be used for min-height/width for fill bar
        dim,

        //percentage w/h of the handle compared to the slider bar
        handlePct = ~~(percent(handleDim, elemDim) * 100);
        //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
        if (isLeftHndl) {
          //left or top percentage value to apply to the fill bar.
          css[lOrT] = `${movement}%`;
          //calculate the new min-height/width for the fill bar.
          dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
          //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
          //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
          if (cb && typeof cb === 'function') {
            cb();
          } //this is only needed for the initialization of 2 handled sliders
        } else {
          //just caching the value of the left/bottom handle's left/top property
          var handlePos = parseFloat(this.$handle[0].style[lOrT]);
          //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
          //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
          dim = movement - (isNaN(handlePos) ? (this.options.initialStart - this.options.start) / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
        }
        // assign the min-height/width to our css object
        css[`min-${hOrW}`] = `${dim}%`;
      }

      this.$element.one('finished.zf.animate', function () {
        /**
         * Fires when the handle is done moving.
         * @event Slider#moved
         */
        _this.$element.trigger('moved.zf.slider', [$hndl]);
      });

      //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
      var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

      Foundation.Move(moveTime, $hndl, function () {
        // adjusting the left/top property of the handle, based on the percentage calculated above
        // if movement isNaN, that is because the slider is hidden and we cannot determine handle width,
        // fall back to next best guess.
        if (isNaN(movement)) {
          $hndl.css(lOrT, `${pctOfBar * 100}%`);
        } else {
          $hndl.css(lOrT, `${movement}%`);
        }

        if (!_this.options.doubleSided) {
          //if single-handled, a simple method to expand the fill bar
          _this.$fill.css(hOrW, `${pctOfBar * 100}%`);
        } else {
          //otherwise, use the css object we created above
          _this.$fill.css(css);
        }
      });

      /**
       * Fires when the value has not been change for a given time.
       * @event Slider#changed
       */
      clearTimeout(_this.timeout);
      _this.timeout = setTimeout(function () {
        _this.$element.trigger('changed.zf.slider', [$hndl]);
      }, _this.options.changedDelay);
    }

    /**
     * Sets the initial attribute for the slider element.
     * @function
     * @private
     * @param {Number} idx - index of the current handle/input to use.
     */
    _setInitAttr(idx) {
      var initVal = idx === 0 ? this.options.initialStart : this.options.initialEnd;
      var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
      this.inputs.eq(idx).attr({
        'id': id,
        'max': this.options.end,
        'min': this.options.start,
        'step': this.options.step
      });
      this.inputs.eq(idx).val(initVal);
      this.handles.eq(idx).attr({
        'role': 'slider',
        'aria-controls': id,
        'aria-valuemax': this.options.end,
        'aria-valuemin': this.options.start,
        'aria-valuenow': initVal,
        'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
        'tabindex': 0
      });
    }

    /**
     * Sets the input and `aria-valuenow` values for the slider element.
     * @function
     * @private
     * @param {jQuery} $handle - the currently selected handle.
     * @param {Number} val - floating point of the new value.
     */
    _setValues($handle, val) {
      var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
      this.inputs.eq(idx).val(val);
      $handle.attr('aria-valuenow', val);
    }

    /**
     * Handles events on the slider element.
     * Calculates the new location of the current handle.
     * If there are two handles and the bar was clicked, it determines which handle to move.
     * @function
     * @private
     * @param {Object} e - the `event` object passed from the listener.
     * @param {jQuery} $handle - the current handle to calculate for, if selected.
     * @param {Number} val - floating point number for the new value of the slider.
     * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
     */
    _handleEvent(e, $handle, val) {
      var value, hasVal;
      if (!val) {
        //click or drag events
        e.preventDefault();
        var _this = this,
            vertical = this.options.vertical,
            param = vertical ? 'height' : 'width',
            direction = vertical ? 'top' : 'left',
            eventOffset = vertical ? e.pageY : e.pageX,
            halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
            barDim = this.$element[0].getBoundingClientRect()[param],
            windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

        var elemOffset = this.$element.offset()[direction];

        // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
        // best way to guess this is simulated is if clientY == pageY
        if (e.clientY === e.pageY) {
          eventOffset = eventOffset + windowScroll;
        }
        var eventFromBar = eventOffset - elemOffset;
        var barXY;
        if (eventFromBar < 0) {
          barXY = 0;
        } else if (eventFromBar > barDim) {
          barXY = barDim;
        } else {
          barXY = eventFromBar;
        }
        var offsetPct = percent(barXY, barDim);

        value = this._value(offsetPct);

        // turn everything around for RTL, yay math!
        if (Foundation.rtl() && !this.options.vertical) {
          value = this.options.end - value;
        }

        value = _this._adjustValue(null, value);
        //boolean flag for the setHandlePos fn, specifically for vertical sliders
        hasVal = false;

        if (!$handle) {
          //figure out which handle it is, pass it to the next function.
          var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
              secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
          $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
        }
      } else {
        //change event on input
        value = this._adjustValue(null, val);
        hasVal = true;
      }

      this._setHandlePos($handle, value, hasVal);
    }

    /**
     * Adjustes value for handle in regard to step value. returns adjusted value
     * @function
     * @private
     * @param {jQuery} $handle - the selected handle.
     * @param {Number} value - value to adjust. used if $handle is falsy
     */
    _adjustValue($handle, value) {
      var val,
          step = this.options.step,
          div = parseFloat(step / 2),
          left,
          prev_val,
          next_val;
      if (!!$handle) {
        val = parseFloat($handle.attr('aria-valuenow'));
      } else {
        val = value;
      }
      left = val % step;
      prev_val = val - left;
      next_val = prev_val + step;
      if (left === 0) {
        return val;
      }
      val = val >= prev_val + div ? next_val : prev_val;
      return val;
    }

    /**
     * Adds event listeners to the slider elements.
     * @function
     * @private
     */
    _events() {
      this._eventsForHandle(this.$handle);
      if (this.handles[1]) {
        this._eventsForHandle(this.$handle2);
      }
    }

    /**
     * Adds event listeners a particular handle
     * @function
     * @private
     * @param {jQuery} $handle - the current handle to apply listeners to.
     */
    _eventsForHandle($handle) {
      var _this = this,
          curHandle,
          timer;

      this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
        var idx = _this.inputs.index($(this));
        _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
      });

      if (this.options.clickSelect) {
        this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
          if (_this.$element.data('dragging')) {
            return false;
          }

          if (!$(e.target).is('[data-slider-handle]')) {
            if (_this.options.doubleSided) {
              _this._handleEvent(e);
            } else {
              _this._handleEvent(e, _this.$handle);
            }
          }
        });
      }

      if (this.options.draggable) {
        this.handles.addTouch();

        var $body = $('body');
        $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
          $handle.addClass('is-dragging');
          _this.$fill.addClass('is-dragging'); //
          _this.$element.data('dragging', true);

          curHandle = $(e.currentTarget);

          $body.on('mousemove.zf.slider', function (e) {
            e.preventDefault();
            _this._handleEvent(e, curHandle);
          }).on('mouseup.zf.slider', function (e) {
            _this._handleEvent(e, curHandle);

            $handle.removeClass('is-dragging');
            _this.$fill.removeClass('is-dragging');
            _this.$element.data('dragging', false);

            $body.off('mousemove.zf.slider mouseup.zf.slider');
          });
        })
        // prevent events triggered by touch
        .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
          e.preventDefault();
        });
      }

      $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
        var _$handle = $(this),
            idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
            oldValue = parseFloat(_this.inputs.eq(idx).val()),
            newValue;

        // handle keyboard event with keyboard util
        Foundation.Keyboard.handleKey(e, 'Slider', {
          decrease: function () {
            newValue = oldValue - _this.options.step;
          },
          increase: function () {
            newValue = oldValue + _this.options.step;
          },
          decrease_fast: function () {
            newValue = oldValue - _this.options.step * 10;
          },
          increase_fast: function () {
            newValue = oldValue + _this.options.step * 10;
          },
          handled: function () {
            // only set handle pos when event was handled specially
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue, true);
          }
        });
        /*if (newValue) { // if pressed key has special function, update value
          e.preventDefault();
          _this._setHandlePos(_$handle, newValue);
        }*/
      });
    }

    /**
     * Destroys the slider plugin.
     */
    destroy() {
      this.handles.off('.zf.slider');
      this.inputs.off('.zf.slider');
      this.$element.off('.zf.slider');

      clearTimeout(this.timeout);

      Foundation.unregisterPlugin(this);
    }
  }

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @type {number}
     * @default 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @type {number}
     * @default 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @type {number}
     * @default 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @type {number}
     * @default 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @type {number}
     * @default 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @type {boolean}
     * @default false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @type {boolean}
     * @default true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @type {boolean}
     * @default false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @type {boolean}
     * @default true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @type {boolean}
     * @default false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @type {boolean}
     * @default false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @type {number}
     * @default 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @type {number}
     * @default 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @type {string}
     * @default 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @type {boolean}
     * @default false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @type {number}
     * @default 500
     */
    changedDelay: 500,
    /**
    * Basevalue for non-linear sliders
    * @option
    * @type {number}
    * @default 5
    */
    nonLinearBase: 5,
    /**
    * Basevalue for non-linear sliders, possible values are: `'linear'`, `'pow'` & `'log'`. Pow and Log use the nonLinearBase setting.
    * @option
    * @type {string}
    * @default 'linear'
    */
    positionValueFunction: 'linear'
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }
  function baseLog(base, value) {
    return Math.log(value) / Math.log(base);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  class Sticky {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */
    _init() {
      var $parent = this.$element.parent('[data-sticky-container]'),
          id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
          _this = this;

      if (!$parent.length) {
        this.wasWrapped = true;
      }
      this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
      this.$container.addClass(this.options.containerClass);

      this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id });

      this.scrollCount = this.options.checkEvery;
      this.isStuck = false;
      $(window).one('load.zf.sticky', function () {
        //We calculate the container height to have correct values for anchor points offset calculation.
        _this.containerHeight = _this.$element.css("display") == "none" ? 0 : _this.$element[0].getBoundingClientRect().height;
        _this.$container.css('height', _this.containerHeight);
        _this.elemHeight = _this.containerHeight;
        if (_this.options.anchor !== '') {
          _this.$anchor = $('#' + _this.options.anchor);
        } else {
          _this._parsePoints();
        }

        _this._setSizes(function () {
          var scroll = window.pageYOffset;
          _this._calc(false, scroll);
          //Unstick the element will ensure that proper classes are set.
          if (!_this.isStuck) {
            _this._removeSticky(scroll >= _this.topPoint ? false : true);
          }
        });
        _this._events(id.split('-').reverse().join('-'));
      });
    }

    /**
     * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
     * @function
     * @private
     */
    _parsePoints() {
      var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
          btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
          pts = [top, btm],
          breaks = {};
      for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
        var pt;
        if (typeof pts[i] === 'number') {
          pt = pts[i];
        } else {
          var place = pts[i].split(':'),
              anchor = $(`#${place[0]}`);

          pt = anchor.offset().top;
          if (place[1] && place[1].toLowerCase() === 'bottom') {
            pt += anchor[0].getBoundingClientRect().height;
          }
        }
        breaks[i] = pt;
      }

      this.points = breaks;
      return;
    }

    /**
     * Adds event handlers for the scrolling element.
     * @private
     * @param {String} id - psuedo-random id for unique scroll event listener.
     */
    _events(id) {
      var _this = this,
          scrollListener = this.scrollListener = `scroll.zf.${id}`;
      if (this.isOn) {
        return;
      }
      if (this.canStick) {
        this.isOn = true;
        $(window).off(scrollListener).on(scrollListener, function (e) {
          if (_this.scrollCount === 0) {
            _this.scrollCount = _this.options.checkEvery;
            _this._setSizes(function () {
              _this._calc(false, window.pageYOffset);
            });
          } else {
            _this.scrollCount--;
            _this._calc(false, window.pageYOffset);
          }
        });
      }

      this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
        _this._setSizes(function () {
          _this._calc(false);
          if (_this.canStick) {
            if (!_this.isOn) {
              _this._events(id);
            }
          } else if (_this.isOn) {
            _this._pauseListeners(scrollListener);
          }
        });
      });
    }

    /**
     * Removes event handlers for scroll and change events on anchor.
     * @fires Sticky#pause
     * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
     */
    _pauseListeners(scrollListener) {
      this.isOn = false;
      $(window).off(scrollListener);

      /**
       * Fires when the plugin is paused due to resize event shrinking the view.
       * @event Sticky#pause
       * @private
       */
      this.$element.trigger('pause.zf.sticky');
    }

    /**
     * Called on every `scroll` event and on `_init`
     * fires functions based on booleans and cached values
     * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
     * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
     */
    _calc(checkSizes, scroll) {
      if (checkSizes) {
        this._setSizes();
      }

      if (!this.canStick) {
        if (this.isStuck) {
          this._removeSticky(true);
        }
        return false;
      }

      if (!scroll) {
        scroll = window.pageYOffset;
      }

      if (scroll >= this.topPoint) {
        if (scroll <= this.bottomPoint) {
          if (!this.isStuck) {
            this._setSticky();
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(false);
          }
        }
      } else {
        if (this.isStuck) {
          this._removeSticky(true);
        }
      }
    }

    /**
     * Causes the $element to become stuck.
     * Adds `position: fixed;`, and helper classes.
     * @fires Sticky#stuckto
     * @function
     * @private
     */
    _setSticky() {
      var _this = this,
          stickTo = this.options.stickTo,
          mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
          notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
          css = {};

      css[mrgn] = `${this.options[mrgn]}em`;
      css[stickTo] = 0;
      css[notStuckTo] = 'auto';
      this.isStuck = true;
      this.$element.removeClass(`is-anchored is-at-${notStuckTo}`).addClass(`is-stuck is-at-${stickTo}`).css(css)
      /**
       * Fires when the $element has become `position: fixed;`
       * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
       * @event Sticky#stuckto
       */
      .trigger(`sticky.zf.stuckto:${stickTo}`);
      this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
        _this._setSizes();
      });
    }

    /**
     * Causes the $element to become unstuck.
     * Removes `position: fixed;`, and helper classes.
     * Adds other helper classes.
     * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
     * @fires Sticky#unstuckfrom
     * @private
     */
    _removeSticky(isTop) {
      var stickTo = this.options.stickTo,
          stickToTop = stickTo === 'top',
          css = {},
          anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
          mrgn = stickToTop ? 'marginTop' : 'marginBottom',
          notStuckTo = stickToTop ? 'bottom' : 'top',
          topOrBottom = isTop ? 'top' : 'bottom';

      css[mrgn] = 0;

      css['bottom'] = 'auto';
      if (isTop) {
        css['top'] = 0;
      } else {
        css['top'] = anchorPt;
      }

      this.isStuck = false;
      this.$element.removeClass(`is-stuck is-at-${stickTo}`).addClass(`is-anchored is-at-${topOrBottom}`).css(css)
      /**
       * Fires when the $element has become anchored.
       * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
       * @event Sticky#unstuckfrom
       */
      .trigger(`sticky.zf.unstuckfrom:${topOrBottom}`);
    }

    /**
     * Sets the $element and $container sizes for plugin.
     * Calls `_setBreakPoints`.
     * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
     * @private
     */
    _setSizes(cb) {
      this.canStick = Foundation.MediaQuery.is(this.options.stickyOn);
      if (!this.canStick) {
        if (cb && typeof cb === 'function') {
          cb();
        }
      }
      var _this = this,
          newElemWidth = this.$container[0].getBoundingClientRect().width,
          comp = window.getComputedStyle(this.$container[0]),
          pdngl = parseInt(comp['padding-left'], 10),
          pdngr = parseInt(comp['padding-right'], 10);

      if (this.$anchor && this.$anchor.length) {
        this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
      } else {
        this._parsePoints();
      }

      this.$element.css({
        'max-width': `${newElemWidth - pdngl - pdngr}px`
      });

      var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
      if (this.$element.css("display") == "none") {
        newContainerHeight = 0;
      }
      this.containerHeight = newContainerHeight;
      this.$container.css({
        height: newContainerHeight
      });
      this.elemHeight = newContainerHeight;

      if (!this.isStuck) {
        if (this.$element.hasClass('is-at-bottom')) {
          var anchorPt = (this.points ? this.points[1] - this.$container.offset().top : this.anchorHeight) - this.elemHeight;
          this.$element.css('top', anchorPt);
        }
      }

      this._setBreakPoints(newContainerHeight, function () {
        if (cb && typeof cb === 'function') {
          cb();
        }
      });
    }

    /**
     * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
     * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
     * @param {Function} cb - optional callback function to be called on completion.
     * @private
     */
    _setBreakPoints(elemHeight, cb) {
      if (!this.canStick) {
        if (cb && typeof cb === 'function') {
          cb();
        } else {
          return false;
        }
      }
      var mTop = emCalc(this.options.marginTop),
          mBtm = emCalc(this.options.marginBottom),
          topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
          bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

      // topPoint = this.$anchor.offset().top || this.points[0],
      // bottomPoint = topPoint + this.anchorHeight || this.points[1],
      winHeight = window.innerHeight;

      if (this.options.stickTo === 'top') {
        topPoint -= mTop;
        bottomPoint -= elemHeight + mTop;
      } else if (this.options.stickTo === 'bottom') {
        topPoint -= winHeight - (elemHeight + mBtm);
        bottomPoint -= winHeight - mBtm;
      } else {
        //this would be the stickTo: both option... tricky
      }

      this.topPoint = topPoint;
      this.bottomPoint = bottomPoint;

      if (cb && typeof cb === 'function') {
        cb();
      }
    }

    /**
     * Destroys the current sticky element.
     * Resets the element to the top position first.
     * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
     * @function
     */
    destroy() {
      this._removeSticky(true);

      this.$element.removeClass(`${this.options.stickyClass} is-anchored is-at-top`).css({
        height: '',
        top: '',
        bottom: '',
        'max-width': ''
      }).off('resizeme.zf.trigger');
      if (this.$anchor && this.$anchor.length) {
        this.$anchor.off('change.zf.sticky');
      }
      $(window).off(this.scrollListener);

      if (this.wasWrapped) {
        this.$element.unwrap();
      } else {
        this.$container.removeClass(this.options.containerClass).css({
          height: ''
        });
      }
      Foundation.unregisterPlugin(this);
    }
  }

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @type {string}
     * @default '&lt;div data-sticky-container&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to. Can be `'top'` or `'bottom'`.
     * @option
     * @type {string}
     * @default 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @type {string}
     * @default ''
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @type {string}
     * @default ''
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @type {string}
     * @default ''
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @type {number}
     * @default 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @type {number}
     * @default 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @type {string}
     * @default 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @type {string}
     * @default 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @type {string}
     * @default 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @type {number}
     * @default -1
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  class Tabs {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */
    _init() {
      var _this = this;

      this.$element.attr({ 'role': 'tablist' });
      this.$tabTitles = this.$element.find(`.${this.options.linkClass}`);
      this.$tabContent = $(`[data-tabs-content="${this.$element[0].id}"]`);

      this.$tabTitles.each(function () {
        var $elem = $(this),
            $link = $elem.find('a'),
            isActive = $elem.hasClass(`${_this.options.linkActiveClass}`),
            hash = $link[0].hash.slice(1),
            linkId = $link[0].id ? $link[0].id : `${hash}-label`,
            $tabContent = $(`#${hash}`);

        $elem.attr({ 'role': 'presentation' });

        $link.attr({
          'role': 'tab',
          'aria-controls': hash,
          'aria-selected': isActive,
          'id': linkId
        });

        $tabContent.attr({
          'role': 'tabpanel',
          'aria-hidden': !isActive,
          'aria-labelledby': linkId
        });

        if (isActive && _this.options.autoFocus) {
          $(window).load(function () {
            $('html, body').animate({ scrollTop: $elem.offset().top }, _this.options.deepLinkSmudgeDelay, () => {
              $link.focus();
            });
          });
        }
      });
      if (this.options.matchHeight) {
        var $images = this.$tabContent.find('img');

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._setHeight.bind(this));
        } else {
          this._setHeight();
        }
      }

      //current context-bound function to open tabs on page load or history popstate
      this._checkDeepLink = () => {
        var anchor = window.location.hash;
        //need a hash and a relevant anchor in this tabset
        if (anchor.length) {
          var $link = this.$element.find('[href="' + anchor + '"]');
          if ($link.length) {
            this.selectTab($(anchor), true);

            //roll up a little to show the titles
            if (this.options.deepLinkSmudge) {
              var offset = this.$element.offset();
              $('html, body').animate({ scrollTop: offset.top }, this.options.deepLinkSmudgeDelay);
            }

            /**
              * Fires when the zplugin has deeplinked at pageload
              * @event Tabs#deeplink
              */
            this.$element.trigger('deeplink.zf.tabs', [$link, $(anchor)]);
          }
        }
      };

      //use browser to open a tab, if it exists in this tabset
      if (this.options.deepLink) {
        this._checkDeepLink();
      }

      this._events();
    }

    /**
     * Adds event handlers for items within the tabs.
     * @private
     */
    _events() {
      this._addKeyHandler();
      this._addClickHandler();
      this._setHeightMqHandler = null;

      if (this.options.matchHeight) {
        this._setHeightMqHandler = this._setHeight.bind(this);

        $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
      }

      if (this.options.deepLink) {
        $(window).on('popstate', this._checkDeepLink);
      }
    }

    /**
     * Adds click handlers for items within the tabs.
     * @private
     */
    _addClickHandler() {
      var _this = this;

      this.$element.off('click.zf.tabs').on('click.zf.tabs', `.${this.options.linkClass}`, function (e) {
        e.preventDefault();
        e.stopPropagation();
        _this._handleTabChange($(this));
      });
    }

    /**
     * Adds keyboard event handlers for items within the tabs.
     * @private
     */
    _addKeyHandler() {
      var _this = this;

      this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
        if (e.which === 9) return;

        var $element = $(this),
            $elements = $element.parent('ul').children('li'),
            $prevElement,
            $nextElement;

        $elements.each(function (i) {
          if ($(this).is($element)) {
            if (_this.options.wrapOnKeys) {
              $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
              $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
            } else {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
            }
            return;
          }
        });

        // handle keyboard event with keyboard util
        Foundation.Keyboard.handleKey(e, 'Tabs', {
          open: function () {
            $element.find('[role="tab"]').focus();
            _this._handleTabChange($element);
          },
          previous: function () {
            $prevElement.find('[role="tab"]').focus();
            _this._handleTabChange($prevElement);
          },
          next: function () {
            $nextElement.find('[role="tab"]').focus();
            _this._handleTabChange($nextElement);
          },
          handled: function () {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      });
    }

    /**
     * Opens the tab `$targetContent` defined by `$target`. Collapses active tab.
     * @param {jQuery} $target - Tab to open.
     * @param {boolean} historyHandled - browser has already handled a history update
     * @fires Tabs#change
     * @function
     */
    _handleTabChange($target, historyHandled) {

      /**
       * Check for active class on target. Collapse if exists.
       */
      if ($target.hasClass(`${this.options.linkActiveClass}`)) {
        if (this.options.activeCollapse) {
          this._collapseTab($target);

          /**
           * Fires when the zplugin has successfully collapsed tabs.
           * @event Tabs#collapse
           */
          this.$element.trigger('collapse.zf.tabs', [$target]);
        }
        return;
      }

      var $oldTab = this.$element.find(`.${this.options.linkClass}.${this.options.linkActiveClass}`),
          $tabLink = $target.find('[role="tab"]'),
          hash = $tabLink[0].hash,
          $targetContent = this.$tabContent.find(hash);

      //close old tab
      this._collapseTab($oldTab);

      //open new tab
      this._openTab($target);

      //either replace or update browser history
      if (this.options.deepLink && !historyHandled) {
        var anchor = $target.find('a').attr('href');

        if (this.options.updateHistory) {
          history.pushState({}, '', anchor);
        } else {
          history.replaceState({}, '', anchor);
        }
      }

      /**
       * Fires when the plugin has successfully changed tabs.
       * @event Tabs#change
       */
      this.$element.trigger('change.zf.tabs', [$target, $targetContent]);

      //fire to children a mutation event
      $targetContent.find("[data-mutate]").trigger("mutateme.zf.trigger");
    }

    /**
     * Opens the tab `$targetContent` defined by `$target`.
     * @param {jQuery} $target - Tab to Open.
     * @function
     */
    _openTab($target) {
      var $tabLink = $target.find('[role="tab"]'),
          hash = $tabLink[0].hash,
          $targetContent = this.$tabContent.find(hash);

      $target.addClass(`${this.options.linkActiveClass}`);

      $tabLink.attr({ 'aria-selected': 'true' });

      $targetContent.addClass(`${this.options.panelActiveClass}`).attr({ 'aria-hidden': 'false' });
    }

    /**
     * Collapses `$targetContent` defined by `$target`.
     * @param {jQuery} $target - Tab to Open.
     * @function
     */
    _collapseTab($target) {
      var $target_anchor = $target.removeClass(`${this.options.linkActiveClass}`).find('[role="tab"]').attr({ 'aria-selected': 'false' });

      $(`#${$target_anchor.attr('aria-controls')}`).removeClass(`${this.options.panelActiveClass}`).attr({ 'aria-hidden': 'true' });
    }

    /**
     * Public method for selecting a content pane to display.
     * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
     * @param {boolean} historyHandled - browser has already handled a history update
     * @function
     */
    selectTab(elem, historyHandled) {
      var idStr;

      if (typeof elem === 'object') {
        idStr = elem[0].id;
      } else {
        idStr = elem;
      }

      if (idStr.indexOf('#') < 0) {
        idStr = `#${idStr}`;
      }

      var $target = this.$tabTitles.find(`[href="${idStr}"]`).parent(`.${this.options.linkClass}`);

      this._handleTabChange($target, historyHandled);
    }
    /**
     * Sets the height of each panel to the height of the tallest panel.
     * If enabled in options, gets called on media query change.
     * If loading content via external source, can be called directly or with _reflow.
     * If enabled with `data-match-height="true"`, tabs sets to equal height
     * @function
     * @private
     */
    _setHeight() {
      var max = 0,
          _this = this; // Lock down the `this` value for the root tabs object

      this.$tabContent.find(`.${this.options.panelClass}`).css('height', '').each(function () {

        var panel = $(this),
            isActive = panel.hasClass(`${_this.options.panelActiveClass}`); // get the options from the parent instead of trying to get them from the child

        if (!isActive) {
          panel.css({ 'visibility': 'hidden', 'display': 'block' });
        }

        var temp = this.getBoundingClientRect().height;

        if (!isActive) {
          panel.css({
            'visibility': '',
            'display': ''
          });
        }

        max = temp > max ? temp : max;
      }).css('height', `${max}px`);
    }

    /**
     * Destroys an instance of an tabs.
     * @fires Tabs#destroyed
     */
    destroy() {
      this.$element.find(`.${this.options.linkClass}`).off('.zf.tabs').hide().end().find(`.${this.options.panelClass}`).hide();

      if (this.options.matchHeight) {
        if (this._setHeightMqHandler != null) {
          $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
        }
      }

      if (this.options.deepLink) {
        $(window).off('popstate', this._checkDeepLink);
      }

      Foundation.unregisterPlugin(this);
    }
  }

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of pane specified by hash anchor
     * @option
     * @type {boolean}
     * @default false
     */
    deepLink: false,

    /**
     * Adjust the deep link scroll to make sure the top of the tab panel is visible
     * @option
     * @type {boolean}
     * @default false
     */
    deepLinkSmudge: false,

    /**
     * Animation time (ms) for the deep link adjustment
     * @option
     * @type {number}
     * @default 300
     */
    deepLinkSmudgeDelay: 300,

    /**
     * Update the browser history with the open tab
     * @option
     * @type {boolean}
     * @default false
     */
    updateHistory: false,

    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * Not recommended if more than one tab panel per page.
     * @option
     * @type {boolean}
     * @default false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @type {boolean}
     * @default true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @type {boolean}
     * @default false
     */
    matchHeight: false,

    /**
     * Allows active tabs to collapse when clicked.
     * @option
     * @type {boolean}
     * @default false
     */
    activeCollapse: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @type {string}
     * @default 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the active `li` in tab link list.
     * @option
     * @type {string}
     * @default 'is-active'
     */
    linkActiveClass: 'is-active',

    /**
     * Class applied to the content containers.
     * @option
     * @type {string}
     * @default 'tabs-panel'
     */
    panelClass: 'tabs-panel',

    /**
     * Class applied to the active content container.
     * @option
     * @type {string}
     * @default 'is-active'
     */
    panelActiveClass: 'is-active'
  };

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  class Toggler {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */
    _init() {
      var input;
      // Parse animation classes if they were set
      if (this.options.animate) {
        input = this.options.animate.split(' ');

        this.animationIn = input[0];
        this.animationOut = input[1] || null;
      }
      // Otherwise, parse toggle class
      else {
          input = this.$element.data('toggler');
          // Allow for a . at the beginning of the string
          this.className = input[0] === '.' ? input.slice(1) : input;
        }

      // Add ARIA attributes to triggers
      var id = this.$element[0].id;
      $(`[data-open="${id}"], [data-close="${id}"], [data-toggle="${id}"]`).attr('aria-controls', id);
      // If the target is hidden, add aria-hidden
      this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
    }

    /**
     * Initializes events for the toggle trigger.
     * @function
     * @private
     */
    _events() {
      this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
    }

    /**
     * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
     * @function
     * @fires Toggler#on
     * @fires Toggler#off
     */
    toggle() {
      this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
    }

    _toggleClass() {
      this.$element.toggleClass(this.className);

      var isOn = this.$element.hasClass(this.className);
      if (isOn) {
        /**
         * Fires if the target element has the class after a toggle.
         * @event Toggler#on
         */
        this.$element.trigger('on.zf.toggler');
      } else {
        /**
         * Fires if the target element does not have the class after a toggle.
         * @event Toggler#off
         */
        this.$element.trigger('off.zf.toggler');
      }

      this._updateARIA(isOn);
      this.$element.find('[data-mutate]').trigger('mutateme.zf.trigger');
    }

    _toggleAnimate() {
      var _this = this;

      if (this.$element.is(':hidden')) {
        Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
          _this._updateARIA(true);
          this.trigger('on.zf.toggler');
          this.find('[data-mutate]').trigger('mutateme.zf.trigger');
        });
      } else {
        Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
          _this._updateARIA(false);
          this.trigger('off.zf.toggler');
          this.find('[data-mutate]').trigger('mutateme.zf.trigger');
        });
      }
    }

    _updateARIA(isOn) {
      this.$element.attr('aria-expanded', isOn ? true : false);
    }

    /**
     * Destroys the instance of Toggler on the element.
     * @function
     */
    destroy() {
      this.$element.off('.zf.toggler');
      Foundation.unregisterPlugin(this);
    }
  }

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @type {boolean}
     * @default false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   */

  class Tooltip {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */
    _init() {
      var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

      this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
      this.options.tipText = this.options.tipText || this.$element.attr('title');
      this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

      if (this.options.allowHtml) {
        this.template.appendTo(document.body).html(this.options.tipText).hide();
      } else {
        this.template.appendTo(document.body).text(this.options.tipText).hide();
      }

      this.$element.attr({
        'title': '',
        'aria-describedby': elemId,
        'data-yeti-box': elemId,
        'data-toggle': elemId,
        'data-resize': elemId
      }).addClass(this.options.triggerClass);

      //helper variables to track movement on collisions
      this.usedPositions = [];
      this.counter = 4;
      this.classChanged = false;

      this._events();
    }

    /**
     * Grabs the current positioning class, if present, and returns the value or an empty string.
     * @private
     */
    _getPositionClass(element) {
      if (!element) {
        return '';
      }
      // var position = element.attr('class').match(/top|left|right/g);
      var position = element[0].className.match(/\b(top|left|right)\b/g);
      position = position ? position[0] : '';
      return position;
    }
    /**
     * builds the tooltip element, adds attributes, and returns the template.
     * @private
     */
    _buildTemplate(id) {
      var templateClasses = `${this.options.tooltipClass} ${this.options.positionClass} ${this.options.templateClasses}`.trim();
      var $template = $('<div></div>').addClass(templateClasses).attr({
        'role': 'tooltip',
        'aria-hidden': true,
        'data-is-active': false,
        'data-is-focus': false,
        'id': id
      });
      return $template;
    }

    /**
     * Function that gets called if a collision event is detected.
     * @param {String} position - positioning class to try
     * @private
     */
    _reposition(position) {
      this.usedPositions.push(position ? position : 'bottom');

      //default, try switching to opposite side
      if (!position && this.usedPositions.indexOf('top') < 0) {
        this.template.addClass('top');
      } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
        this.template.removeClass(position);
      } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
        this.template.removeClass(position).addClass('right');
      } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
        this.template.removeClass(position).addClass('left');
      }

      //if default change didn't work, try bottom or left first
      else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.template.addClass('left');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        }
        //if nothing cleared, set to bottom
        else {
            this.template.removeClass(position);
          }
      this.classChanged = true;
      this.counter--;
    }

    /**
     * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
     * if the tooltip is larger than the screen width, default to full width - any user selected margin
     * @private
     */
    _setPosition() {
      var position = this._getPositionClass(this.template),
          $tipDims = Foundation.Box.GetDimensions(this.template),
          $anchorDims = Foundation.Box.GetDimensions(this.$element),
          direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
          param = direction === 'top' ? 'height' : 'width',
          offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
          _this = this;

      if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
          // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
          'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
          'height': 'auto'
        });
        return false;
      }

      this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

      while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
        this._reposition(position);
        this._setPosition();
      }
    }

    /**
     * reveals the tooltip, and fires an event to close any other open tooltips on the page
     * @fires Tooltip#closeme
     * @fires Tooltip#show
     * @function
     */
    show() {
      if (this.options.showOn !== 'all' && !Foundation.MediaQuery.is(this.options.showOn)) {
        // console.error('The screen is too small to display this tooltip');
        return false;
      }

      var _this = this;
      this.template.css('visibility', 'hidden').show();
      this._setPosition();

      /**
       * Fires to close all other open tooltips on the page
       * @event Closeme#tooltip
       */
      this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

      this.template.attr({
        'data-is-active': true,
        'aria-hidden': false
      });
      _this.isActive = true;
      // console.log(this.template);
      this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
        //maybe do stuff?
      });
      /**
       * Fires when the tooltip is shown
       * @event Tooltip#show
       */
      this.$element.trigger('show.zf.tooltip');
    }

    /**
     * Hides the current tooltip, and resets the positioning class if it was changed due to collision
     * @fires Tooltip#hide
     * @function
     */
    hide() {
      // console.log('hiding', this.$element.data('yeti-box'));
      var _this = this;
      this.template.stop().attr({
        'aria-hidden': true,
        'data-is-active': false
      }).fadeOut(this.options.fadeOutDuration, function () {
        _this.isActive = false;
        _this.isClick = false;
        if (_this.classChanged) {
          _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

          _this.usedPositions = [];
          _this.counter = 4;
          _this.classChanged = false;
        }
      });
      /**
       * fires when the tooltip is hidden
       * @event Tooltip#hide
       */
      this.$element.trigger('hide.zf.tooltip');
    }

    /**
     * adds event listeners for the tooltip and its anchor
     * TODO combine some of the listeners like focus and mouseenter, etc.
     * @private
     */
    _events() {
      var _this = this;
      var $template = this.template;
      var isFocus = false;

      if (!this.options.disableHover) {

        this.$element.on('mouseenter.zf.tooltip', function (e) {
          if (!_this.isActive) {
            _this.timeout = setTimeout(function () {
              _this.show();
            }, _this.options.hoverDelay);
          }
        }).on('mouseleave.zf.tooltip', function (e) {
          clearTimeout(_this.timeout);
          if (!isFocus || _this.isClick && !_this.options.clickOpen) {
            _this.hide();
          }
        });
      }

      if (this.options.clickOpen) {
        this.$element.on('mousedown.zf.tooltip', function (e) {
          e.stopImmediatePropagation();
          if (_this.isClick) {
            //_this.hide();
            // _this.isClick = false;
          } else {
            _this.isClick = true;
            if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
              _this.show();
            }
          }
        });
      } else {
        this.$element.on('mousedown.zf.tooltip', function (e) {
          e.stopImmediatePropagation();
          _this.isClick = true;
        });
      }

      if (!this.options.disableForTouch) {
        this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
          _this.isActive ? _this.hide() : _this.show();
        });
      }

      this.$element.on({
        // 'toggle.zf.trigger': this.toggle.bind(this),
        // 'close.zf.trigger': this.hide.bind(this)
        'close.zf.trigger': this.hide.bind(this)
      });

      this.$element.on('focus.zf.tooltip', function (e) {
        isFocus = true;
        if (_this.isClick) {
          // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
          // a real focus, otherwise on hover and come back we get bad behavior
          if (!_this.options.clickOpen) {
            isFocus = false;
          }
          return false;
        } else {
          _this.show();
        }
      }).on('focusout.zf.tooltip', function (e) {
        isFocus = false;
        _this.isClick = false;
        _this.hide();
      }).on('resizeme.zf.trigger', function () {
        if (_this.isActive) {
          _this._setPosition();
        }
      });
    }

    /**
     * adds a toggle method, in addition to the static show() & hide() functions
     * @function
     */
    toggle() {
      if (this.isActive) {
        this.hide();
      } else {
        this.show();
      }
    }

    /**
     * Destroys an instance of tooltip, removes template element from the view.
     * @function
     */
    destroy() {
      this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tooltip').removeClass('has-tip top right left').removeAttr('aria-describedby aria-haspopup data-disable-hover data-resize data-toggle data-tooltip data-yeti-box');

      this.template.remove();

      Foundation.unregisterPlugin(this);
    }
  }

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @type {number}
     * @default 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @type {number}
     * @default 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @type {number}
     * @default 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @type {boolean}
     * @default false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @type {string}
     * @default ''
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @type {string}
     * @default 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @type {string}
     * @default 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @type {string}
     * @default 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @type {string}
     * @default ''
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @type {string}
     * @default ''
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @type {boolean}
     * @default true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @type {string}
     * @default ''
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @type {number}
     * @default 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @type {number}
     * @default 12
     */
    hOffset: 12,
    /**
    * Allow HTML in tooltip. Warning: If you are loading user-generated content into tooltips,
    * allowing HTML may open yourself up to XSS attacks.
    * @option
    * @type {boolean}
    * @default false
    */
    allowHtml: false
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * ResponsiveAccordionTabs module.
   * @module foundation.responsiveAccordionTabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.motion
   * @requires foundation.accordion
   * @requires foundation.tabs
   */

  class ResponsiveAccordionTabs {
    /**
     * Creates a new instance of a responsive accordion tabs.
     * @class
     * @fires ResponsiveAccordionTabs#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = $(element);
      this.options = $.extend({}, this.$element.data(), options);
      this.rules = this.$element.data('responsive-accordion-tabs');
      this.currentMq = null;
      this.currentPlugin = null;
      if (!this.$element.attr('id')) {
        this.$element.attr('id', Foundation.GetYoDigits(6, 'responsiveaccordiontabs'));
      };

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveAccordionTabs');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-responsive-accordion-tabs' attribute on the element.
     * @function
     * @private
     */
    _init() {
      // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
      if (typeof this.rules === 'string') {
        let rulesTree = {};

        // Parse rules from "classes" pulled from data attribute
        let rules = this.rules.split(' ');

        // Iterate through every rule found
        for (let i = 0; i < rules.length; i++) {
          let rule = rules[i].split('-');
          let ruleSize = rule.length > 1 ? rule[0] : 'small';
          let rulePlugin = rule.length > 1 ? rule[1] : rule[0];

          if (MenuPlugins[rulePlugin] !== null) {
            rulesTree[ruleSize] = MenuPlugins[rulePlugin];
          }
        }

        this.rules = rulesTree;
      }

      this._getAllOptions();

      if (!$.isEmptyObject(this.rules)) {
        this._checkMediaQueries();
      }
    }

    _getAllOptions() {
      //get all defaults and options
      var _this = this;
      _this.allOptions = {};
      for (var key in MenuPlugins) {
        if (MenuPlugins.hasOwnProperty(key)) {
          var obj = MenuPlugins[key];
          try {
            var dummyPlugin = $('<ul></ul>');
            var tmpPlugin = new obj.plugin(dummyPlugin, _this.options);
            for (var keyKey in tmpPlugin.options) {
              if (tmpPlugin.options.hasOwnProperty(keyKey) && keyKey !== 'zfPlugin') {
                var objObj = tmpPlugin.options[keyKey];
                _this.allOptions[keyKey] = objObj;
              }
            }
            tmpPlugin.destroy();
          } catch (e) {}
        }
      }
    }

    /**
     * Initializes events for the Menu.
     * @function
     * @private
     */
    _events() {
      var _this = this;

      $(window).on('changed.zf.mediaquery', function () {
        _this._checkMediaQueries();
      });
    }

    /**
     * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
     * @function
     * @private
     */
    _checkMediaQueries() {
      var matchedMq,
          _this = this;
      // Iterate through each rule and find the last matching rule
      $.each(this.rules, function (key) {
        if (Foundation.MediaQuery.atLeast(key)) {
          matchedMq = key;
        }
      });

      // No match? No dice
      if (!matchedMq) return;

      // Plugin already initialized? We good
      if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

      // Remove existing plugin-specific CSS classes
      $.each(MenuPlugins, function (key, value) {
        _this.$element.removeClass(value.cssClass);
      });

      // Add the CSS class for the new plugin
      this.$element.addClass(this.rules[matchedMq].cssClass);

      // Create an instance of the new plugin
      if (this.currentPlugin) {
        //don't know why but on nested elements data zfPlugin get's lost
        if (!this.currentPlugin.$element.data('zfPlugin') && this.storezfData) this.currentPlugin.$element.data('zfPlugin', this.storezfData);
        this.currentPlugin.destroy();
      }
      this._handleMarkup(this.rules[matchedMq].cssClass);
      this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
      this.storezfData = this.currentPlugin.$element.data('zfPlugin');
    }

    _handleMarkup(toSet) {
      var _this = this,
          fromString = 'accordion';
      var $panels = $('[data-tabs-content=' + this.$element.attr('id') + ']');
      if ($panels.length) fromString = 'tabs';
      if (fromString === toSet) {
        return;
      };

      var tabsTitle = _this.allOptions.linkClass ? _this.allOptions.linkClass : 'tabs-title';
      var tabsPanel = _this.allOptions.panelClass ? _this.allOptions.panelClass : 'tabs-panel';

      this.$element.removeAttr('role');
      var $liHeads = this.$element.children('.' + tabsTitle + ',[data-accordion-item]').removeClass(tabsTitle).removeClass('accordion-item').removeAttr('data-accordion-item');
      var $liHeadsA = $liHeads.children('a').removeClass('accordion-title');

      if (fromString === 'tabs') {
        $panels = $panels.children('.' + tabsPanel).removeClass(tabsPanel).removeAttr('role').removeAttr('aria-hidden').removeAttr('aria-labelledby');
        $panels.children('a').removeAttr('role').removeAttr('aria-controls').removeAttr('aria-selected');
      } else {
        $panels = $liHeads.children('[data-tab-content]').removeClass('accordion-content');
      };

      $panels.css({ display: '', visibility: '' });
      $liHeads.css({ display: '', visibility: '' });
      if (toSet === 'accordion') {
        $panels.each(function (key, value) {
          $(value).appendTo($liHeads.get(key)).addClass('accordion-content').attr('data-tab-content', '').removeClass('is-active').css({ height: '' });
          $('[data-tabs-content=' + _this.$element.attr('id') + ']').after('<div id="tabs-placeholder-' + _this.$element.attr('id') + '"></div>').remove();
          $liHeads.addClass('accordion-item').attr('data-accordion-item', '');
          $liHeadsA.addClass('accordion-title');
        });
      } else if (toSet === 'tabs') {
        var $tabsContent = $('[data-tabs-content=' + _this.$element.attr('id') + ']');
        var $placeholder = $('#tabs-placeholder-' + _this.$element.attr('id'));
        if ($placeholder.length) {
          $tabsContent = $('<div class="tabs-content"></div>').insertAfter($placeholder).attr('data-tabs-content', _this.$element.attr('id'));
          $placeholder.remove();
        } else {
          $tabsContent = $('<div class="tabs-content"></div>').insertAfter(_this.$element).attr('data-tabs-content', _this.$element.attr('id'));
        };
        $panels.each(function (key, value) {
          var tempValue = $(value).appendTo($tabsContent).addClass(tabsPanel);
          var hash = $liHeadsA.get(key).hash.slice(1);
          var id = $(value).attr('id') || Foundation.GetYoDigits(6, 'accordion');
          if (hash !== id) {
            if (hash !== '') {
              $(value).attr('id', hash);
            } else {
              hash = id;
              $(value).attr('id', hash);
              $($liHeadsA.get(key)).attr('href', $($liHeadsA.get(key)).attr('href').replace('#', '') + '#' + hash);
            };
          };
          var isActive = $($liHeads.get(key)).hasClass('is-active');
          if (isActive) {
            tempValue.addClass('is-active');
          };
        });
        $liHeads.addClass(tabsTitle);
      };
    }

    /**
     * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
     * @function
     */
    destroy() {
      if (this.currentPlugin) this.currentPlugin.destroy();
      $(window).off('.zf.ResponsiveAccordionTabs');
      Foundation.unregisterPlugin(this);
    }
  }

  ResponsiveAccordionTabs.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    tabs: {
      cssClass: 'tabs',
      plugin: Foundation._plugins.tabs || null
    },
    accordion: {
      cssClass: 'accordion',
      plugin: Foundation._plugins.accordion || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveAccordionTabs, 'ResponsiveAccordionTabs');
}(jQuery);
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;
;jQuery(document).foundation();
;/* Sticky Footer */

(function ($) {

  var $footer = $('[data-sticky-footer]'); // only search once

  $(window).bind('load resize orientationChange', function () {

    var pos = $footer.position(),
        height = $(window).height() - pos.top - ($footer.height() - 1);

    if (height > 0) {
      $footer.css('margin-top', height);
    }
  });
})(jQuery);
;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvdW5kYXRpb24uY29yZS5qcyIsImZvdW5kYXRpb24udXRpbC5ib3guanMiLCJmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmQuanMiLCJmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeS5qcyIsImZvdW5kYXRpb24udXRpbC5tb3Rpb24uanMiLCJmb3VuZGF0aW9uLnV0aWwubmVzdC5qcyIsImZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyLmpzIiwiZm91bmRhdGlvbi51dGlsLnRvdWNoLmpzIiwiZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzLmpzIiwiZm91bmRhdGlvbi5hYmlkZS5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uLmpzIiwiZm91bmRhdGlvbi5hY2NvcmRpb25NZW51LmpzIiwiZm91bmRhdGlvbi5kcmlsbGRvd24uanMiLCJmb3VuZGF0aW9uLmRyb3Bkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bk1lbnUuanMiLCJmb3VuZGF0aW9uLmVxdWFsaXplci5qcyIsImZvdW5kYXRpb24uaW50ZXJjaGFuZ2UuanMiLCJmb3VuZGF0aW9uLm1hZ2VsbGFuLmpzIiwiZm91bmRhdGlvbi5vZmZjYW52YXMuanMiLCJmb3VuZGF0aW9uLm9yYml0LmpzIiwiZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudS5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZS5qcyIsImZvdW5kYXRpb24ucmV2ZWFsLmpzIiwiZm91bmRhdGlvbi5zbGlkZXIuanMiLCJmb3VuZGF0aW9uLnN0aWNreS5qcyIsImZvdW5kYXRpb24udGFicy5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsImZvdW5kYXRpb24udG9vbHRpcC5qcyIsImZvdW5kYXRpb24uemYucmVzcG9uc2l2ZUFjY29yZGlvblRhYnMuanMiLCJtb3Rpb24tdWkuanMiLCJlczYuanMiLCJpbml0LWZvdW5kYXRpb24uanMiLCJzdGlja3lmb290ZXIuanMiLCJ0ZXN0LmpzIl0sIm5hbWVzIjpbIiQiLCJGT1VOREFUSU9OX1ZFUlNJT04iLCJGb3VuZGF0aW9uIiwidmVyc2lvbiIsIl9wbHVnaW5zIiwiX3V1aWRzIiwicnRsIiwiYXR0ciIsInBsdWdpbiIsIm5hbWUiLCJjbGFzc05hbWUiLCJmdW5jdGlvbk5hbWUiLCJhdHRyTmFtZSIsImh5cGhlbmF0ZSIsInJlZ2lzdGVyUGx1Z2luIiwicGx1Z2luTmFtZSIsImNvbnN0cnVjdG9yIiwidG9Mb3dlckNhc2UiLCJ1dWlkIiwiR2V0WW9EaWdpdHMiLCIkZWxlbWVudCIsImRhdGEiLCJ0cmlnZ2VyIiwicHVzaCIsInVucmVnaXN0ZXJQbHVnaW4iLCJzcGxpY2UiLCJpbmRleE9mIiwicmVtb3ZlQXR0ciIsInJlbW92ZURhdGEiLCJwcm9wIiwicmVJbml0IiwicGx1Z2lucyIsImlzSlEiLCJlYWNoIiwiX2luaXQiLCJ0eXBlIiwiX3RoaXMiLCJmbnMiLCJwbGdzIiwiZm9yRWFjaCIsInAiLCJmb3VuZGF0aW9uIiwiT2JqZWN0Iiwia2V5cyIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsImxlbmd0aCIsIm5hbWVzcGFjZSIsIk1hdGgiLCJyb3VuZCIsInBvdyIsInJhbmRvbSIsInRvU3RyaW5nIiwic2xpY2UiLCJyZWZsb3ciLCJlbGVtIiwiaSIsIiRlbGVtIiwiZmluZCIsImFkZEJhY2siLCIkZWwiLCJvcHRzIiwid2FybiIsInRoaW5nIiwic3BsaXQiLCJlIiwib3B0IiwibWFwIiwiZWwiLCJ0cmltIiwicGFyc2VWYWx1ZSIsImVyIiwiZ2V0Rm5OYW1lIiwidHJhbnNpdGlvbmVuZCIsInRyYW5zaXRpb25zIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiZW5kIiwidCIsInN0eWxlIiwic2V0VGltZW91dCIsInRyaWdnZXJIYW5kbGVyIiwidXRpbCIsInRocm90dGxlIiwiZnVuYyIsImRlbGF5IiwidGltZXIiLCJjb250ZXh0IiwiYXJncyIsImFyZ3VtZW50cyIsImFwcGx5IiwibWV0aG9kIiwiJG1ldGEiLCIkbm9KUyIsImFwcGVuZFRvIiwiaGVhZCIsInJlbW92ZUNsYXNzIiwiTWVkaWFRdWVyeSIsIkFycmF5IiwicHJvdG90eXBlIiwiY2FsbCIsInBsdWdDbGFzcyIsInVuZGVmaW5lZCIsIlJlZmVyZW5jZUVycm9yIiwiVHlwZUVycm9yIiwid2luZG93IiwiZm4iLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInZlbmRvcnMiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ2cCIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImxhc3RUaW1lIiwiY2FsbGJhY2siLCJuZXh0VGltZSIsIm1heCIsImNsZWFyVGltZW91dCIsInBlcmZvcm1hbmNlIiwic3RhcnQiLCJGdW5jdGlvbiIsImJpbmQiLCJvVGhpcyIsImFBcmdzIiwiZlRvQmluZCIsImZOT1AiLCJmQm91bmQiLCJjb25jYXQiLCJmdW5jTmFtZVJlZ2V4IiwicmVzdWx0cyIsImV4ZWMiLCJzdHIiLCJpc05hTiIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwialF1ZXJ5IiwiQm94IiwiSW1Ob3RUb3VjaGluZ1lvdSIsIkdldERpbWVuc2lvbnMiLCJHZXRPZmZzZXRzIiwiZWxlbWVudCIsInBhcmVudCIsImxyT25seSIsInRiT25seSIsImVsZURpbXMiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJwYXJEaW1zIiwib2Zmc2V0IiwiaGVpZ2h0Iiwid2lkdGgiLCJ3aW5kb3dEaW1zIiwiYWxsRGlycyIsIkVycm9yIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInBhclJlY3QiLCJwYXJlbnROb2RlIiwid2luUmVjdCIsImJvZHkiLCJ3aW5ZIiwicGFnZVlPZmZzZXQiLCJ3aW5YIiwicGFnZVhPZmZzZXQiLCJwYXJlbnREaW1zIiwiYW5jaG9yIiwicG9zaXRpb24iLCJ2T2Zmc2V0IiwiaE9mZnNldCIsImlzT3ZlcmZsb3ciLCIkZWxlRGltcyIsIiRhbmNob3JEaW1zIiwia2V5Q29kZXMiLCJjb21tYW5kcyIsIktleWJvYXJkIiwiZ2V0S2V5Q29kZXMiLCJwYXJzZUtleSIsImV2ZW50Iiwia2V5Iiwid2hpY2giLCJrZXlDb2RlIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9VcHBlckNhc2UiLCJzaGlmdEtleSIsImN0cmxLZXkiLCJhbHRLZXkiLCJoYW5kbGVLZXkiLCJjb21wb25lbnQiLCJmdW5jdGlvbnMiLCJjb21tYW5kTGlzdCIsImNtZHMiLCJjb21tYW5kIiwibHRyIiwiZXh0ZW5kIiwicmV0dXJuVmFsdWUiLCJoYW5kbGVkIiwidW5oYW5kbGVkIiwiZmluZEZvY3VzYWJsZSIsImZpbHRlciIsImlzIiwicmVnaXN0ZXIiLCJjb21wb25lbnROYW1lIiwidHJhcEZvY3VzIiwiJGZvY3VzYWJsZSIsIiRmaXJzdEZvY3VzYWJsZSIsImVxIiwiJGxhc3RGb2N1c2FibGUiLCJvbiIsInRhcmdldCIsInByZXZlbnREZWZhdWx0IiwiZm9jdXMiLCJyZWxlYXNlRm9jdXMiLCJvZmYiLCJrY3MiLCJrIiwia2MiLCJkZWZhdWx0UXVlcmllcyIsImxhbmRzY2FwZSIsInBvcnRyYWl0IiwicmV0aW5hIiwicXVlcmllcyIsImN1cnJlbnQiLCJzZWxmIiwiZXh0cmFjdGVkU3R5bGVzIiwiY3NzIiwibmFtZWRRdWVyaWVzIiwicGFyc2VTdHlsZVRvT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCJ2YWx1ZSIsIl9nZXRDdXJyZW50U2l6ZSIsIl93YXRjaGVyIiwiYXRMZWFzdCIsInNpemUiLCJxdWVyeSIsImdldCIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwibWF0Y2hlZCIsIm5ld1NpemUiLCJjdXJyZW50U2l6ZSIsInN0eWxlTWVkaWEiLCJtZWRpYSIsInNjcmlwdCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwiaW5mbyIsImlkIiwiaW5zZXJ0QmVmb3JlIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImN1cnJlbnRTdHlsZSIsIm1hdGNoTWVkaXVtIiwidGV4dCIsInN0eWxlU2hlZXQiLCJjc3NUZXh0IiwidGV4dENvbnRlbnQiLCJzdHlsZU9iamVjdCIsInJlZHVjZSIsInJldCIsInBhcmFtIiwicGFydHMiLCJ2YWwiLCJkZWNvZGVVUklDb21wb25lbnQiLCJpc0FycmF5IiwiaW5pdENsYXNzZXMiLCJhY3RpdmVDbGFzc2VzIiwiTW90aW9uIiwiYW5pbWF0ZUluIiwiYW5pbWF0aW9uIiwiY2IiLCJhbmltYXRlIiwiYW5pbWF0ZU91dCIsIk1vdmUiLCJkdXJhdGlvbiIsImFuaW0iLCJwcm9nIiwibW92ZSIsInRzIiwiaXNJbiIsImluaXRDbGFzcyIsImFjdGl2ZUNsYXNzIiwicmVzZXQiLCJhZGRDbGFzcyIsInNob3ciLCJvZmZzZXRXaWR0aCIsIm9uZSIsImZpbmlzaCIsImhpZGUiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJOZXN0IiwiRmVhdGhlciIsIm1lbnUiLCJpdGVtcyIsInN1Yk1lbnVDbGFzcyIsInN1Ykl0ZW1DbGFzcyIsImhhc1N1YkNsYXNzIiwiJGl0ZW0iLCIkc3ViIiwiY2hpbGRyZW4iLCJCdXJuIiwiVGltZXIiLCJvcHRpb25zIiwibmFtZVNwYWNlIiwicmVtYWluIiwiaXNQYXVzZWQiLCJyZXN0YXJ0IiwiaW5maW5pdGUiLCJwYXVzZSIsIm9uSW1hZ2VzTG9hZGVkIiwiaW1hZ2VzIiwidW5sb2FkZWQiLCJjb21wbGV0ZSIsInJlYWR5U3RhdGUiLCJzaW5nbGVJbWFnZUxvYWRlZCIsInNyYyIsInNwb3RTd2lwZSIsImVuYWJsZWQiLCJkb2N1bWVudEVsZW1lbnQiLCJtb3ZlVGhyZXNob2xkIiwidGltZVRocmVzaG9sZCIsInN0YXJ0UG9zWCIsInN0YXJ0UG9zWSIsInN0YXJ0VGltZSIsImVsYXBzZWRUaW1lIiwiaXNNb3ZpbmciLCJvblRvdWNoRW5kIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9uVG91Y2hNb3ZlIiwieCIsInRvdWNoZXMiLCJwYWdlWCIsInkiLCJwYWdlWSIsImR4IiwiZHkiLCJkaXIiLCJhYnMiLCJvblRvdWNoU3RhcnQiLCJhZGRFdmVudExpc3RlbmVyIiwiaW5pdCIsInRlYXJkb3duIiwic3BlY2lhbCIsInN3aXBlIiwic2V0dXAiLCJub29wIiwiYWRkVG91Y2giLCJoYW5kbGVUb3VjaCIsImNoYW5nZWRUb3VjaGVzIiwiZmlyc3QiLCJldmVudFR5cGVzIiwidG91Y2hzdGFydCIsInRvdWNobW92ZSIsInRvdWNoZW5kIiwic2ltdWxhdGVkRXZlbnQiLCJNb3VzZUV2ZW50Iiwic2NyZWVuWCIsInNjcmVlblkiLCJjbGllbnRYIiwiY2xpZW50WSIsImNyZWF0ZUV2ZW50IiwiaW5pdE1vdXNlRXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiTXV0YXRpb25PYnNlcnZlciIsInByZWZpeGVzIiwidHJpZ2dlcnMiLCJzdG9wUHJvcGFnYXRpb24iLCJmYWRlT3V0IiwiY2hlY2tMaXN0ZW5lcnMiLCJldmVudHNMaXN0ZW5lciIsInJlc2l6ZUxpc3RlbmVyIiwic2Nyb2xsTGlzdGVuZXIiLCJtdXRhdGVMaXN0ZW5lciIsImNsb3NlbWVMaXN0ZW5lciIsInlldGlCb3hlcyIsInBsdWdOYW1lcyIsImxpc3RlbmVycyIsImpvaW4iLCJwbHVnaW5JZCIsIm5vdCIsImRlYm91bmNlIiwiJG5vZGVzIiwibm9kZXMiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiIsIm11dGF0aW9uUmVjb3Jkc0xpc3QiLCIkdGFyZ2V0IiwiYXR0cmlidXRlTmFtZSIsImNsb3Nlc3QiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJBYmlkZSIsImRlZmF1bHRzIiwiJGlucHV0cyIsIl9ldmVudHMiLCJyZXNldEZvcm0iLCJ2YWxpZGF0ZUZvcm0iLCJ2YWxpZGF0ZU9uIiwidmFsaWRhdGVJbnB1dCIsImxpdmVWYWxpZGF0ZSIsInZhbGlkYXRlT25CbHVyIiwiX3JlZmxvdyIsInJlcXVpcmVkQ2hlY2siLCJpc0dvb2QiLCJjaGVja2VkIiwiZmluZEZvcm1FcnJvciIsIiRlcnJvciIsInNpYmxpbmdzIiwiZm9ybUVycm9yU2VsZWN0b3IiLCJmaW5kTGFiZWwiLCIkbGFiZWwiLCJmaW5kUmFkaW9MYWJlbHMiLCIkZWxzIiwibGFiZWxzIiwiYWRkRXJyb3JDbGFzc2VzIiwiJGZvcm1FcnJvciIsImxhYmVsRXJyb3JDbGFzcyIsImZvcm1FcnJvckNsYXNzIiwiaW5wdXRFcnJvckNsYXNzIiwicmVtb3ZlUmFkaW9FcnJvckNsYXNzZXMiLCJncm91cE5hbWUiLCIkbGFiZWxzIiwiJGZvcm1FcnJvcnMiLCJyZW1vdmVFcnJvckNsYXNzZXMiLCJjbGVhclJlcXVpcmUiLCJ2YWxpZGF0ZWQiLCJjdXN0b21WYWxpZGF0b3IiLCJ2YWxpZGF0b3IiLCJlcXVhbFRvIiwidmFsaWRhdGVSYWRpbyIsInZhbGlkYXRlVGV4dCIsIm1hdGNoVmFsaWRhdGlvbiIsInZhbGlkYXRvcnMiLCJnb29kVG9HbyIsIm1lc3NhZ2UiLCJkZXBlbmRlbnRFbGVtZW50cyIsImFjYyIsIm5vRXJyb3IiLCJwYXR0ZXJuIiwiaW5wdXRUZXh0IiwidmFsaWQiLCJwYXR0ZXJucyIsIlJlZ0V4cCIsIiRncm91cCIsInJlcXVpcmVkIiwiY2xlYXIiLCJ2IiwiJGZvcm0iLCJkZXN0cm95IiwiYWxwaGEiLCJhbHBoYV9udW1lcmljIiwiaW50ZWdlciIsIm51bWJlciIsImNhcmQiLCJjdnYiLCJlbWFpbCIsInVybCIsImRvbWFpbiIsImRhdGV0aW1lIiwiZGF0ZSIsInRpbWUiLCJkYXRlSVNPIiwibW9udGhfZGF5X3llYXIiLCJkYXlfbW9udGhfeWVhciIsImNvbG9yIiwiQWNjb3JkaW9uIiwiJHRhYnMiLCJpZHgiLCIkY29udGVudCIsImxpbmtJZCIsIiRpbml0QWN0aXZlIiwiZG93biIsIiR0YWJDb250ZW50IiwidG9nZ2xlIiwibmV4dCIsIiRhIiwibXVsdGlFeHBhbmQiLCJwcmV2aW91cyIsInByZXYiLCJoYXNDbGFzcyIsInVwIiwiZmlyc3RUaW1lIiwiJGN1cnJlbnRBY3RpdmUiLCJzbGlkZURvd24iLCJzbGlkZVNwZWVkIiwiJGF1bnRzIiwiYWxsb3dBbGxDbG9zZWQiLCJzbGlkZVVwIiwic3RvcCIsIkFjY29yZGlvbk1lbnUiLCJtdWx0aU9wZW4iLCIkbWVudUxpbmtzIiwic3ViSWQiLCJpc0FjdGl2ZSIsImluaXRQYW5lcyIsIiRzdWJtZW51IiwiJGVsZW1lbnRzIiwiJHByZXZFbGVtZW50IiwiJG5leHRFbGVtZW50IiwibWluIiwicGFyZW50cyIsIm9wZW4iLCJjbG9zZSIsImNsb3NlQWxsIiwiaGlkZUFsbCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsInNob3dBbGwiLCJwYXJlbnRzVW50aWwiLCJhZGQiLCIkbWVudXMiLCJEcmlsbGRvd24iLCIkc3VibWVudUFuY2hvcnMiLCIkc3VibWVudXMiLCIkbWVudUl0ZW1zIiwiX3ByZXBhcmVNZW51IiwiX3JlZ2lzdGVyRXZlbnRzIiwiX2tleWJvYXJkRXZlbnRzIiwiJGxpbmsiLCJwYXJlbnRMaW5rIiwiY2xvbmUiLCJwcmVwZW5kVG8iLCJ3cmFwIiwiJG1lbnUiLCIkYmFjayIsImJhY2tCdXR0b25Qb3NpdGlvbiIsImFwcGVuZCIsImJhY2tCdXR0b24iLCJwcmVwZW5kIiwiX2JhY2siLCJhdXRvSGVpZ2h0IiwiJHdyYXBwZXIiLCJ3cmFwcGVyIiwiYW5pbWF0ZUhlaWdodCIsIl9nZXRNYXhEaW1zIiwiX3Jlc2l6ZSIsIl9zaG93IiwiY2xvc2VPbkNsaWNrIiwiJGJvZHkiLCJjb250YWlucyIsIl9oaWRlQWxsIiwic2Nyb2xsVG9wIiwiX2JpbmRIYW5kbGVyIiwiX3Njcm9sbFRvcCIsIiRzY3JvbGxUb3BFbGVtZW50Iiwic2Nyb2xsVG9wRWxlbWVudCIsInNjcm9sbFBvcyIsInBhcnNlSW50Iiwic2Nyb2xsVG9wT2Zmc2V0IiwiYW5pbWF0aW9uRHVyYXRpb24iLCJhbmltYXRpb25FYXNpbmciLCJfaGlkZSIsInBhcmVudFN1Yk1lbnUiLCJfbWVudUxpbmtFdmVudHMiLCJibHVyIiwibWF4SGVpZ2h0IiwicmVzdWx0IiwibnVtT2ZFbGVtcyIsInVud3JhcCIsInJlbW92ZSIsIkRyb3Bkb3duIiwiJGlkIiwiJGFuY2hvciIsInBhcmVudENsYXNzIiwiJHBhcmVudCIsInBvc2l0aW9uQ2xhc3MiLCJnZXRQb3NpdGlvbkNsYXNzIiwiY291bnRlciIsInVzZWRQb3NpdGlvbnMiLCJ2ZXJ0aWNhbFBvc2l0aW9uIiwibWF0Y2giLCJob3Jpem9udGFsUG9zaXRpb24iLCJfcmVwb3NpdGlvbiIsImNsYXNzQ2hhbmdlZCIsIl9zZXRQb3NpdGlvbiIsImRpcmVjdGlvbiIsIm5ld1dpZHRoIiwicGFyZW50SE9mZnNldCIsIiRwYXJlbnREaW1zIiwiaG92ZXIiLCJib2R5RGF0YSIsIndoYXRpbnB1dCIsInRpbWVvdXQiLCJob3ZlckRlbGF5IiwiaG92ZXJQYW5lIiwidmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzIiwiX2FkZEJvZHlIYW5kbGVyIiwiYXV0b0ZvY3VzIiwiY3VyUG9zaXRpb25DbGFzcyIsIkRyb3Bkb3duTWVudSIsInN1YnMiLCJ2ZXJ0aWNhbENsYXNzIiwicmlnaHRDbGFzcyIsImFsaWdubWVudCIsImNoYW5nZWQiLCJfaXNWZXJ0aWNhbCIsImhhc1RvdWNoIiwib250b3VjaHN0YXJ0IiwicGFyQ2xhc3MiLCJoYW5kbGVDbGlja0ZuIiwiaGFzU3ViIiwiaGFzQ2xpY2tlZCIsImNsaWNrT3BlbiIsImZvcmNlRm9sbG93IiwiY2xvc2VPbkNsaWNrSW5zaWRlIiwiZGlzYWJsZUhvdmVyIiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwibmV4dFNpYmxpbmciLCJwcmV2U2libGluZyIsIm9wZW5TdWIiLCJjbG9zZVN1YiIsIiRzaWJzIiwib2xkQ2xhc3MiLCIkcGFyZW50TGkiLCIkdG9DbG9zZSIsInNvbWV0aGluZ1RvQ2xvc2UiLCJFcXVhbGl6ZXIiLCJlcUlkIiwiJHdhdGNoZWQiLCJoYXNOZXN0ZWQiLCJpc05lc3RlZCIsImlzT24iLCJvblJlc2l6ZU1lQm91bmQiLCJfb25SZXNpemVNZSIsIm9uUG9zdEVxdWFsaXplZEJvdW5kIiwiX29uUG9zdEVxdWFsaXplZCIsImltZ3MiLCJ0b29TbWFsbCIsImVxdWFsaXplT24iLCJfY2hlY2tNUSIsIl9wYXVzZUV2ZW50cyIsIl9raWxsc3dpdGNoIiwiZXF1YWxpemVPblN0YWNrIiwiX2lzU3RhY2tlZCIsImVxdWFsaXplQnlSb3ciLCJnZXRIZWlnaHRzQnlSb3ciLCJhcHBseUhlaWdodEJ5Um93IiwiZ2V0SGVpZ2h0cyIsImFwcGx5SGVpZ2h0IiwiaGVpZ2h0cyIsImxlbiIsIm9mZnNldEhlaWdodCIsImxhc3RFbFRvcE9mZnNldCIsImdyb3VwcyIsImdyb3VwIiwiZWxPZmZzZXRUb3AiLCJqIiwibG4iLCJncm91cHNJTGVuZ3RoIiwibGVuSiIsIkludGVyY2hhbmdlIiwicnVsZXMiLCJjdXJyZW50UGF0aCIsIl9hZGRCcmVha3BvaW50cyIsIl9nZW5lcmF0ZVJ1bGVzIiwicnVsZSIsInBhdGgiLCJTUEVDSUFMX1FVRVJJRVMiLCJydWxlc0xpc3QiLCJub2RlTmFtZSIsInJlc3BvbnNlIiwiaHRtbCIsIk1hZ2VsbGFuIiwiY2FsY1BvaW50cyIsIiR0YXJnZXRzIiwiJGxpbmtzIiwiJGFjdGl2ZSIsInBvaW50cyIsIndpbkhlaWdodCIsImlubmVySGVpZ2h0IiwiY2xpZW50SGVpZ2h0IiwiZG9jSGVpZ2h0Iiwic2Nyb2xsSGVpZ2h0IiwiJHRhciIsInB0IiwidGhyZXNob2xkIiwidGFyZ2V0UG9pbnQiLCJlYXNpbmciLCJkZWVwTGlua2luZyIsImxvY2F0aW9uIiwiaGFzaCIsInNjcm9sbFRvTG9jIiwiX3VwZGF0ZUFjdGl2ZSIsImFycml2YWwiLCJnZXRBdHRyaWJ1dGUiLCJsb2MiLCJfaW5UcmFuc2l0aW9uIiwiYmFyT2Zmc2V0Iiwid2luUG9zIiwiY3VySWR4IiwiaXNEb3duIiwiY3VyVmlzaWJsZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJPZmZDYW52YXMiLCIkbGFzdFRyaWdnZXIiLCIkdHJpZ2dlcnMiLCJ0cmFuc2l0aW9uIiwiY29udGVudE92ZXJsYXkiLCJvdmVybGF5Iiwib3ZlcmxheVBvc2l0aW9uIiwic2V0QXR0cmlidXRlIiwiJG92ZXJsYXkiLCJpc1JldmVhbGVkIiwicmV2ZWFsQ2xhc3MiLCJyZXZlYWxPbiIsIl9zZXRNUUNoZWNrZXIiLCJ0cmFuc2l0aW9uVGltZSIsIl9oYW5kbGVLZXlib2FyZCIsInJldmVhbCIsIiRjbG9zZXIiLCJfc3RvcFNjcm9sbGluZyIsIl9yZWNvcmRTY3JvbGxhYmxlIiwiYWxsb3dVcCIsImFsbG93RG93biIsImxhc3RZIiwib3JpZ2luYWxFdmVudCIsIl9zdG9wU2Nyb2xsUHJvcGFnYXRpb24iLCJmb3JjZVRvIiwic2Nyb2xsVG8iLCJjb250ZW50U2Nyb2xsIiwiT3JiaXQiLCJfcmVzZXQiLCJjb250YWluZXJDbGFzcyIsIiRzbGlkZXMiLCJzbGlkZUNsYXNzIiwiJGltYWdlcyIsImluaXRBY3RpdmUiLCJ1c2VNVUkiLCJfcHJlcGFyZUZvck9yYml0IiwiYnVsbGV0cyIsIl9sb2FkQnVsbGV0cyIsImF1dG9QbGF5IiwiZ2VvU3luYyIsImFjY2Vzc2libGUiLCIkYnVsbGV0cyIsImJveE9mQnVsbGV0cyIsInRpbWVyRGVsYXkiLCJjaGFuZ2VTbGlkZSIsIl9zZXRXcmFwcGVySGVpZ2h0IiwidGVtcCIsIl9zZXRTbGlkZUhlaWdodCIsInBhdXNlT25Ib3ZlciIsIm5hdkJ1dHRvbnMiLCIkY29udHJvbHMiLCJuZXh0Q2xhc3MiLCJwcmV2Q2xhc3MiLCIkc2xpZGUiLCJfdXBkYXRlQnVsbGV0cyIsImlzTFRSIiwiY2hvc2VuU2xpZGUiLCIkY3VyU2xpZGUiLCIkZmlyc3RTbGlkZSIsIiRsYXN0U2xpZGUiLCJsYXN0IiwiZGlySW4iLCJkaXJPdXQiLCIkbmV3U2xpZGUiLCJpbmZpbml0ZVdyYXAiLCIkb2xkQnVsbGV0Iiwic3BhbiIsImRldGFjaCIsIiRuZXdCdWxsZXQiLCJhbmltSW5Gcm9tUmlnaHQiLCJhbmltT3V0VG9SaWdodCIsImFuaW1JbkZyb21MZWZ0IiwiYW5pbU91dFRvTGVmdCIsIlJlc3BvbnNpdmVNZW51IiwiY3VycmVudE1xIiwiY3VycmVudFBsdWdpbiIsInJ1bGVzVHJlZSIsInJ1bGVTaXplIiwicnVsZVBsdWdpbiIsIk1lbnVQbHVnaW5zIiwiaXNFbXB0eU9iamVjdCIsIl9jaGVja01lZGlhUXVlcmllcyIsIm1hdGNoZWRNcSIsImNzc0NsYXNzIiwiZHJvcGRvd24iLCJkcmlsbGRvd24iLCJhY2NvcmRpb24iLCJSZXNwb25zaXZlVG9nZ2xlIiwidGFyZ2V0SUQiLCIkdGFyZ2V0TWVudSIsIiR0b2dnbGVyIiwiaW5wdXQiLCJhbmltYXRpb25JbiIsImFuaW1hdGlvbk91dCIsIl91cGRhdGUiLCJfdXBkYXRlTXFIYW5kbGVyIiwidG9nZ2xlTWVudSIsImhpZGVGb3IiLCJSZXZlYWwiLCJjYWNoZWQiLCJtcSIsImlzTW9iaWxlIiwibW9iaWxlU25pZmYiLCJmdWxsU2NyZWVuIiwiX21ha2VPdmVybGF5IiwiZGVlcExpbmsiLCJfdXBkYXRlUG9zaXRpb24iLCJvdXRlcldpZHRoIiwib3V0ZXJIZWlnaHQiLCJtYXJnaW4iLCJfaGFuZGxlU3RhdGUiLCJtdWx0aXBsZU9wZW5lZCIsImFkZFJldmVhbE9wZW5DbGFzc2VzIiwib3JpZ2luYWxTY3JvbGxQb3MiLCJhZnRlckFuaW1hdGlvbiIsImZvY3VzYWJsZUVsZW1lbnRzIiwic2hvd0RlbGF5IiwiX2V4dHJhSGFuZGxlcnMiLCJjbG9zZU9uRXNjIiwiZmluaXNoVXAiLCJoaWRlRGVsYXkiLCJyZXNldE9uQ2xvc2UiLCJyZXBsYWNlU3RhdGUiLCJ0aXRsZSIsImhyZWYiLCJidG1PZmZzZXRQY3QiLCJpUGhvbmVTbmlmZiIsImFuZHJvaWRTbmlmZiIsIlNsaWRlciIsImlucHV0cyIsImhhbmRsZXMiLCIkaGFuZGxlIiwiJGlucHV0IiwiJGZpbGwiLCJ2ZXJ0aWNhbCIsImlzRGJsIiwiZGlzYWJsZWQiLCJkaXNhYmxlZENsYXNzIiwiYmluZGluZyIsIl9zZXRJbml0QXR0ciIsImRvdWJsZVNpZGVkIiwiJGhhbmRsZTIiLCIkaW5wdXQyIiwic2V0SGFuZGxlcyIsIl9zZXRIYW5kbGVQb3MiLCJfcGN0T2ZCYXIiLCJwY3RPZkJhciIsInBlcmNlbnQiLCJwb3NpdGlvblZhbHVlRnVuY3Rpb24iLCJfbG9nVHJhbnNmb3JtIiwiX3Bvd1RyYW5zZm9ybSIsInRvRml4ZWQiLCJfdmFsdWUiLCJiYXNlTG9nIiwibm9uTGluZWFyQmFzZSIsIiRobmRsIiwibm9JbnZlcnQiLCJoMlZhbCIsInN0ZXAiLCJoMVZhbCIsInZlcnQiLCJoT3JXIiwibE9yVCIsImhhbmRsZURpbSIsImVsZW1EaW0iLCJweFRvTW92ZSIsIm1vdmVtZW50IiwiZGVjaW1hbCIsIl9zZXRWYWx1ZXMiLCJpc0xlZnRIbmRsIiwiZGltIiwiaGFuZGxlUGN0IiwiaGFuZGxlUG9zIiwiaW5pdGlhbFN0YXJ0IiwibW92ZVRpbWUiLCJjaGFuZ2VkRGVsYXkiLCJpbml0VmFsIiwiaW5pdGlhbEVuZCIsIl9oYW5kbGVFdmVudCIsImhhc1ZhbCIsImV2ZW50T2Zmc2V0IiwiaGFsZk9mSGFuZGxlIiwiYmFyRGltIiwid2luZG93U2Nyb2xsIiwic2Nyb2xsTGVmdCIsImVsZW1PZmZzZXQiLCJldmVudEZyb21CYXIiLCJiYXJYWSIsIm9mZnNldFBjdCIsIl9hZGp1c3RWYWx1ZSIsImZpcnN0SG5kbFBvcyIsImFic1Bvc2l0aW9uIiwic2VjbmRIbmRsUG9zIiwiZGl2IiwicHJldl92YWwiLCJuZXh0X3ZhbCIsIl9ldmVudHNGb3JIYW5kbGUiLCJjdXJIYW5kbGUiLCJjbGlja1NlbGVjdCIsImRyYWdnYWJsZSIsImN1cnJlbnRUYXJnZXQiLCJfJGhhbmRsZSIsIm9sZFZhbHVlIiwibmV3VmFsdWUiLCJkZWNyZWFzZSIsImluY3JlYXNlIiwiZGVjcmVhc2VfZmFzdCIsImluY3JlYXNlX2Zhc3QiLCJpbnZlcnRWZXJ0aWNhbCIsImZyYWMiLCJudW0iLCJjbGlja1BvcyIsImJhc2UiLCJsb2ciLCJTdGlja3kiLCJ3YXNXcmFwcGVkIiwiJGNvbnRhaW5lciIsImNvbnRhaW5lciIsIndyYXBJbm5lciIsInN0aWNreUNsYXNzIiwic2Nyb2xsQ291bnQiLCJjaGVja0V2ZXJ5IiwiaXNTdHVjayIsImNvbnRhaW5lckhlaWdodCIsImVsZW1IZWlnaHQiLCJfcGFyc2VQb2ludHMiLCJfc2V0U2l6ZXMiLCJzY3JvbGwiLCJfY2FsYyIsIl9yZW1vdmVTdGlja3kiLCJ0b3BQb2ludCIsInJldmVyc2UiLCJ0b3BBbmNob3IiLCJidG0iLCJidG1BbmNob3IiLCJwdHMiLCJicmVha3MiLCJwbGFjZSIsImNhblN0aWNrIiwiX3BhdXNlTGlzdGVuZXJzIiwiY2hlY2tTaXplcyIsImJvdHRvbVBvaW50IiwiX3NldFN0aWNreSIsInN0aWNrVG8iLCJtcmduIiwibm90U3R1Y2tUbyIsImlzVG9wIiwic3RpY2tUb1RvcCIsImFuY2hvclB0IiwiYW5jaG9ySGVpZ2h0IiwidG9wT3JCb3R0b20iLCJzdGlja3lPbiIsIm5ld0VsZW1XaWR0aCIsImNvbXAiLCJwZG5nbCIsInBkbmdyIiwibmV3Q29udGFpbmVySGVpZ2h0IiwiX3NldEJyZWFrUG9pbnRzIiwibVRvcCIsImVtQ2FsYyIsIm1hcmdpblRvcCIsIm1CdG0iLCJtYXJnaW5Cb3R0b20iLCJlbSIsImZvbnRTaXplIiwiVGFicyIsIiR0YWJUaXRsZXMiLCJsaW5rQ2xhc3MiLCJsaW5rQWN0aXZlQ2xhc3MiLCJsb2FkIiwiZGVlcExpbmtTbXVkZ2VEZWxheSIsIm1hdGNoSGVpZ2h0IiwiX3NldEhlaWdodCIsIl9jaGVja0RlZXBMaW5rIiwic2VsZWN0VGFiIiwiZGVlcExpbmtTbXVkZ2UiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIndyYXBPbktleXMiLCJoaXN0b3J5SGFuZGxlZCIsImFjdGl2ZUNvbGxhcHNlIiwiX2NvbGxhcHNlVGFiIiwiJG9sZFRhYiIsIiR0YWJMaW5rIiwiJHRhcmdldENvbnRlbnQiLCJfb3BlblRhYiIsInVwZGF0ZUhpc3RvcnkiLCJwYW5lbEFjdGl2ZUNsYXNzIiwiJHRhcmdldF9hbmNob3IiLCJpZFN0ciIsInBhbmVsQ2xhc3MiLCJwYW5lbCIsIlRvZ2dsZXIiLCJfdG9nZ2xlQ2xhc3MiLCJ0b2dnbGVDbGFzcyIsIl91cGRhdGVBUklBIiwiX3RvZ2dsZUFuaW1hdGUiLCJUb29sdGlwIiwiaXNDbGljayIsImVsZW1JZCIsIl9nZXRQb3NpdGlvbkNsYXNzIiwidGlwVGV4dCIsInRlbXBsYXRlIiwiX2J1aWxkVGVtcGxhdGUiLCJhbGxvd0h0bWwiLCJ0cmlnZ2VyQ2xhc3MiLCJ0ZW1wbGF0ZUNsYXNzZXMiLCJ0b29sdGlwQ2xhc3MiLCIkdGVtcGxhdGUiLCIkdGlwRGltcyIsInNob3dPbiIsImZhZGVJbiIsImZhZGVJbkR1cmF0aW9uIiwiZmFkZU91dER1cmF0aW9uIiwiaXNGb2N1cyIsImRpc2FibGVGb3JUb3VjaCIsInRvdWNoQ2xvc2VUZXh0IiwiUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMiLCJfZ2V0QWxsT3B0aW9ucyIsImFsbE9wdGlvbnMiLCJvYmoiLCJkdW1teVBsdWdpbiIsInRtcFBsdWdpbiIsImtleUtleSIsIm9iak9iaiIsInN0b3JlemZEYXRhIiwiX2hhbmRsZU1hcmt1cCIsInRvU2V0IiwiZnJvbVN0cmluZyIsIiRwYW5lbHMiLCJ0YWJzVGl0bGUiLCJ0YWJzUGFuZWwiLCIkbGlIZWFkcyIsIiRsaUhlYWRzQSIsImRpc3BsYXkiLCJ2aXNpYmlsaXR5IiwiYWZ0ZXIiLCIkdGFic0NvbnRlbnQiLCIkcGxhY2Vob2xkZXIiLCJpbnNlcnRBZnRlciIsInRlbXBWYWx1ZSIsInRhYnMiLCJlbmRFdmVudCIsIk1vdGlvblVJIiwiJGZvb3RlciIsInBvcyJdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxVQUFTQSxDQUFULEVBQVk7O0FBRWI7O0FBRUEsTUFBSUMscUJBQXFCLE9BQXpCOztBQUVBO0FBQ0E7QUFDQSxNQUFJQyxhQUFhO0FBQ2ZDLGFBQVNGLGtCQURNOztBQUdmOzs7QUFHQUcsY0FBVSxFQU5LOztBQVFmOzs7QUFHQUMsWUFBUSxFQVhPOztBQWFmOzs7QUFHQUMsU0FBSyxZQUFVO0FBQ2IsYUFBT04s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QyxDQUFULEVBQVk7O0FBRVgsTUFBSTZoQyxVQUFVN2hDLEVBQUUsc0JBQUYsQ0FBZCxDQUZXLENBRThCOztBQUV6Q0EsSUFBRTBHLE1BQUYsRUFBVW9CLElBQVYsQ0FBZSwrQkFBZixFQUFnRCxZQUFZOztBQUUxRCxRQUFJZzZCLE1BQU1ELFFBQVFoM0IsUUFBUixFQUFWO0FBQUEsUUFDSWpCLFNBQVU1SixFQUFFMEcsTUFBRixFQUFVa0QsTUFBVixLQUFxQms0QixJQUFJeDRCLEdBQTFCLElBQWtDdTRCLFFBQVFqNEIsTUFBUixLQUFrQixDQUFwRCxDQURiOztBQUdBLFFBQUlBLFNBQVMsQ0FBYixFQUFnQjtBQUNiaTRCLGNBQVFyekIsR0FBUixDQUFZLFlBQVosRUFBMEI1RSxNQUExQjtBQUNGO0FBRUYsR0FURDtBQVdELENBZkQsRUFlR2hCLE1BZkg7Q0NGQSIsImZpbGUiOiJtZWxlbWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiFmdW5jdGlvbigkKSB7XG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgRk9VTkRBVElPTl9WRVJTSU9OID0gJzYuMy4xJztcblxuLy8gR2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4vLyBUaGlzIGlzIGF0dGFjaGVkIHRvIHRoZSB3aW5kb3csIG9yIHVzZWQgYXMgYSBtb2R1bGUgZm9yIEFNRC9Ccm93c2VyaWZ5XG52YXIgRm91bmRhdGlvbiA9IHtcbiAgdmVyc2lvbjogRk9VTkRBVElPTl9WRVJTSU9OLFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgaW5pdGlhbGl6ZWQgcGx1Z2lucy5cbiAgICovXG4gIF9wbHVnaW5zOiB7fSxcblxuICAvKipcbiAgICogU3RvcmVzIGdlbmVyYXRlZCB1bmlxdWUgaWRzIGZvciBwbHVnaW4gaW5zdGFuY2VzXG4gICAqL1xuICBfdXVpZHM6IFtdLFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYm9vbGVhbiBmb3IgUlRMIHN1cHBvcnRcbiAgICovXG4gIHJ0bDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gJCgnaHRtbCcpLmF0dHIoJ2RpcicpID09PSAncnRsJztcbiAgfSxcbiAgLyoqXG4gICAqIERlZmluZXMgYSBGb3VuZGF0aW9uIHBsdWdpbiwgYWRkaW5nIGl0IHRvIHRoZSBgRm91bmRhdGlvbmAgbmFtZXNwYWNlIGFuZCB0aGUgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUgd2hlbiByZWZsb3dpbmcuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBUaGUgY29uc3RydWN0b3Igb2YgdGhlIHBsdWdpbi5cbiAgICovXG4gIHBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKSB7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBhZGRpbmcgdG8gZ2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4gICAgLy8gRXhhbXBsZXM6IEZvdW5kYXRpb24uUmV2ZWFsLCBGb3VuZGF0aW9uLk9mZkNhbnZhc1xuICAgIHZhciBjbGFzc05hbWUgPSAobmFtZSB8fCBmdW5jdGlvbk5hbWUocGx1Z2luKSk7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBzdG9yaW5nIHRoZSBwbHVnaW4sIGFsc28gdXNlZCB0byBjcmVhdGUgdGhlIGlkZW50aWZ5aW5nIGRhdGEgYXR0cmlidXRlIGZvciB0aGUgcGx1Z2luXG4gICAgLy8gRXhhbXBsZXM6IGRhdGEtcmV2ZWFsLCBkYXRhLW9mZi1jYW52YXNcbiAgICB2YXIgYXR0ck5hbWUgID0gaHlwaGVuYXRlKGNsYXNzTmFtZSk7XG5cbiAgICAvLyBBZGQgdG8gdGhlIEZvdW5kYXRpb24gb2JqZWN0IGFuZCB0aGUgcGx1Z2lucyBsaXN0IChmb3IgcmVmbG93aW5nKVxuICAgIHRoaXMuX3BsdWdpbnNbYXR0ck5hbWVdID0gdGhpc1tjbGFzc05hbWVdID0gcGx1Z2luO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFBvcHVsYXRlcyB0aGUgX3V1aWRzIGFycmF5IHdpdGggcG9pbnRlcnMgdG8gZWFjaCBpbmRpdmlkdWFsIHBsdWdpbiBpbnN0YW5jZS5cbiAgICogQWRkcyB0aGUgYHpmUGx1Z2luYCBkYXRhLWF0dHJpYnV0ZSB0byBwcm9ncmFtbWF0aWNhbGx5IGNyZWF0ZWQgcGx1Z2lucyB0byBhbGxvdyB1c2Ugb2YgJChzZWxlY3RvcikuZm91bmRhdGlvbihtZXRob2QpIGNhbGxzLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBpbml0aWFsaXphdGlvbiBldmVudCBmb3IgZWFjaCBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdGhlIG5hbWUgb2YgdGhlIHBsdWdpbiwgcGFzc2VkIGFzIGEgY2FtZWxDYXNlZCBzdHJpbmcuXG4gICAqIEBmaXJlcyBQbHVnaW4jaW5pdFxuICAgKi9cbiAgcmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSl7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBuYW1lID8gaHlwaGVuYXRlKG5hbWUpIDogZnVuY3Rpb25OYW1lKHBsdWdpbi5jb25zdHJ1Y3RvcikudG9Mb3dlckNhc2UoKTtcbiAgICBwbHVnaW4udXVpZCA9IHRoaXMuR2V0WW9EaWdpdHMoNiwgcGx1Z2luTmFtZSk7XG5cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApKXsgcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWAsIHBsdWdpbi51dWlkKTsgfVxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKSl7IHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicsIHBsdWdpbik7IH1cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGluaXRpYWxpemVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jaW5pdFxuICAgICAgICAgICAqL1xuICAgIHBsdWdpbi4kZWxlbWVudC50cmlnZ2VyKGBpbml0LnpmLiR7cGx1Z2luTmFtZX1gKTtcblxuICAgIHRoaXMuX3V1aWRzLnB1c2gocGx1Z2luLnV1aWQpO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFJlbW92ZXMgdGhlIHBsdWdpbnMgdXVpZCBmcm9tIHRoZSBfdXVpZHMgYXJyYXkuXG4gICAqIFJlbW92ZXMgdGhlIHpmUGx1Z2luIGRhdGEgYXR0cmlidXRlLCBhcyB3ZWxsIGFzIHRoZSBkYXRhLXBsdWdpbi1uYW1lIGF0dHJpYnV0ZS5cbiAgICogQWxzbyBmaXJlcyB0aGUgZGVzdHJveWVkIGV2ZW50IGZvciB0aGUgcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAZmlyZXMgUGx1Z2luI2Rlc3Ryb3llZFxuICAgKi9cbiAgdW5yZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IGh5cGhlbmF0ZShmdW5jdGlvbk5hbWUocGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykuY29uc3RydWN0b3IpKTtcblxuICAgIHRoaXMuX3V1aWRzLnNwbGljZSh0aGlzLl91dWlkcy5pbmRleE9mKHBsdWdpbi51dWlkKSwgMSk7XG4gICAgcGx1Z2luLiRlbGVtZW50LnJlbW92ZUF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApLnJlbW92ZURhdGEoJ3pmUGx1Z2luJylcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGJlZW4gZGVzdHJveWVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jZGVzdHJveWVkXG4gICAgICAgICAgICovXG4gICAgICAgICAgLnRyaWdnZXIoYGRlc3Ryb3llZC56Zi4ke3BsdWdpbk5hbWV9YCk7XG4gICAgZm9yKHZhciBwcm9wIGluIHBsdWdpbil7XG4gICAgICBwbHVnaW5bcHJvcF0gPSBudWxsOy8vY2xlYW4gdXAgc2NyaXB0IHRvIHByZXAgZm9yIGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAgICB9XG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogQ2F1c2VzIG9uZSBvciBtb3JlIGFjdGl2ZSBwbHVnaW5zIHRvIHJlLWluaXRpYWxpemUsIHJlc2V0dGluZyBldmVudCBsaXN0ZW5lcnMsIHJlY2FsY3VsYXRpbmcgcG9zaXRpb25zLCBldGMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwbHVnaW5zIC0gb3B0aW9uYWwgc3RyaW5nIG9mIGFuIGluZGl2aWR1YWwgcGx1Z2luIGtleSwgYXR0YWluZWQgYnkgY2FsbGluZyBgJChlbGVtZW50KS5kYXRhKCdwbHVnaW5OYW1lJylgLCBvciBzdHJpbmcgb2YgYSBwbHVnaW4gY2xhc3MgaS5lLiBgJ2Ryb3Bkb3duJ2BcbiAgICogQGRlZmF1bHQgSWYgbm8gYXJndW1lbnQgaXMgcGFzc2VkLCByZWZsb3cgYWxsIGN1cnJlbnRseSBhY3RpdmUgcGx1Z2lucy5cbiAgICovXG4gICByZUluaXQ6IGZ1bmN0aW9uKHBsdWdpbnMpe1xuICAgICB2YXIgaXNKUSA9IHBsdWdpbnMgaW5zdGFuY2VvZiAkO1xuICAgICB0cnl7XG4gICAgICAgaWYoaXNKUSl7XG4gICAgICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgJCh0aGlzKS5kYXRhKCd6ZlBsdWdpbicpLl9pbml0KCk7XG4gICAgICAgICB9KTtcbiAgICAgICB9ZWxzZXtcbiAgICAgICAgIHZhciB0eXBlID0gdHlwZW9mIHBsdWdpbnMsXG4gICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICBmbnMgPSB7XG4gICAgICAgICAgICdvYmplY3QnOiBmdW5jdGlvbihwbGdzKXtcbiAgICAgICAgICAgICBwbGdzLmZvckVhY2goZnVuY3Rpb24ocCl7XG4gICAgICAgICAgICAgICBwID0gaHlwaGVuYXRlKHApO1xuICAgICAgICAgICAgICAgJCgnW2RhdGEtJysgcCArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAnc3RyaW5nJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICBwbHVnaW5zID0gaHlwaGVuYXRlKHBsdWdpbnMpO1xuICAgICAgICAgICAgICQoJ1tkYXRhLScrIHBsdWdpbnMgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3VuZGVmaW5lZCc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgdGhpc1snb2JqZWN0J10oT2JqZWN0LmtleXMoX3RoaXMuX3BsdWdpbnMpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgfTtcbiAgICAgICAgIGZuc1t0eXBlXShwbHVnaW5zKTtcbiAgICAgICB9XG4gICAgIH1jYXRjaChlcnIpe1xuICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgfWZpbmFsbHl7XG4gICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgIH1cbiAgIH0sXG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSByYW5kb20gYmFzZS0zNiB1aWQgd2l0aCBuYW1lc3BhY2luZ1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCAtIG51bWJlciBvZiByYW5kb20gYmFzZS0zNiBkaWdpdHMgZGVzaXJlZC4gSW5jcmVhc2UgZm9yIG1vcmUgcmFuZG9tIHN0cmluZ3MuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2UgLSBuYW1lIG9mIHBsdWdpbiB0byBiZSBpbmNvcnBvcmF0ZWQgaW4gdWlkLCBvcHRpb25hbC5cbiAgICogQGRlZmF1bHQge1N0cmluZ30gJycgLSBpZiBubyBwbHVnaW4gbmFtZSBpcyBwcm92aWRlZCwgbm90aGluZyBpcyBhcHBlbmRlZCB0byB0aGUgdWlkLlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSAtIHVuaXF1ZSBpZFxuICAgKi9cbiAgR2V0WW9EaWdpdHM6IGZ1bmN0aW9uKGxlbmd0aCwgbmFtZXNwYWNlKXtcbiAgICBsZW5ndGggPSBsZW5ndGggfHwgNjtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5wb3coMzYsIGxlbmd0aCArIDEpIC0gTWF0aC5yYW5kb20oKSAqIE1hdGgucG93KDM2LCBsZW5ndGgpKSkudG9TdHJpbmcoMzYpLnNsaWNlKDEpICsgKG5hbWVzcGFjZSA/IGAtJHtuYW1lc3BhY2V9YCA6ICcnKTtcbiAgfSxcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgcGx1Z2lucyBvbiBhbnkgZWxlbWVudHMgd2l0aGluIGBlbGVtYCAoYW5kIGBlbGVtYCBpdHNlbGYpIHRoYXQgYXJlbid0IGFscmVhZHkgaW5pdGlhbGl6ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtIC0galF1ZXJ5IG9iamVjdCBjb250YWluaW5nIHRoZSBlbGVtZW50IHRvIGNoZWNrIGluc2lkZS4gQWxzbyBjaGVja3MgdGhlIGVsZW1lbnQgaXRzZWxmLCB1bmxlc3MgaXQncyB0aGUgYGRvY3VtZW50YCBvYmplY3QuXG4gICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBwbHVnaW5zIC0gQSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZS4gTGVhdmUgdGhpcyBvdXQgdG8gaW5pdGlhbGl6ZSBldmVyeXRoaW5nLlxuICAgKi9cbiAgcmVmbG93OiBmdW5jdGlvbihlbGVtLCBwbHVnaW5zKSB7XG5cbiAgICAvLyBJZiBwbHVnaW5zIGlzIHVuZGVmaW5lZCwganVzdCBncmFiIGV2ZXJ5dGhpbmdcbiAgICBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBwbHVnaW5zID0gT2JqZWN0LmtleXModGhpcy5fcGx1Z2lucyk7XG4gICAgfVxuICAgIC8vIElmIHBsdWdpbnMgaXMgYSBzdHJpbmcsIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkgd2l0aCBvbmUgaXRlbVxuICAgIGVsc2UgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAnc3RyaW5nJykge1xuICAgICAgcGx1Z2lucyA9IFtwbHVnaW5zXTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcGx1Z2luXG4gICAgJC5lYWNoKHBsdWdpbnMsIGZ1bmN0aW9uKGksIG5hbWUpIHtcbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBwbHVnaW5cbiAgICAgIHZhciBwbHVnaW4gPSBfdGhpcy5fcGx1Z2luc1tuYW1lXTtcblxuICAgICAgLy8gTG9jYWxpemUgdGhlIHNlYXJjaCB0byBhbGwgZWxlbWVudHMgaW5zaWRlIGVsZW0sIGFzIHdlbGwgYXMgZWxlbSBpdHNlbGYsIHVubGVzcyBlbGVtID09PSBkb2N1bWVudFxuICAgICAgdmFyICRlbGVtID0gJChlbGVtKS5maW5kKCdbZGF0YS0nK25hbWUrJ10nKS5hZGRCYWNrKCdbZGF0YS0nK25hbWUrJ10nKTtcblxuICAgICAgLy8gRm9yIGVhY2ggcGx1Z2luIGZvdW5kLCBpbml0aWFsaXplIGl0XG4gICAgICAkZWxlbS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJGVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIG9wdHMgPSB7fTtcbiAgICAgICAgLy8gRG9uJ3QgZG91YmxlLWRpcCBvbiBwbHVnaW5zXG4gICAgICAgIGlmICgkZWwuZGF0YSgnemZQbHVnaW4nKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIlRyaWVkIHRvIGluaXRpYWxpemUgXCIrbmFtZStcIiBvbiBhbiBlbGVtZW50IHRoYXQgYWxyZWFkeSBoYXMgYSBGb3VuZGF0aW9uIHBsdWdpbi5cIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpKXtcbiAgICAgICAgICB2YXIgdGhpbmcgPSAkZWwuYXR0cignZGF0YS1vcHRpb25zJykuc3BsaXQoJzsnKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIGkpe1xuICAgICAgICAgICAgdmFyIG9wdCA9IGUuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24oZWwpeyByZXR1cm4gZWwudHJpbSgpOyB9KTtcbiAgICAgICAgICAgIGlmKG9wdFswXSkgb3B0c1tvcHRbMF1dID0gcGFyc2VWYWx1ZShvcHRbMV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAkZWwuZGF0YSgnemZQbHVnaW4nLCBuZXcgcGx1Z2luKCQodGhpcyksIG9wdHMpKTtcbiAgICAgICAgfWNhdGNoKGVyKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVyKTtcbiAgICAgICAgfWZpbmFsbHl7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0Rm5OYW1lOiBmdW5jdGlvbk5hbWUsXG4gIHRyYW5zaXRpb25lbmQ6IGZ1bmN0aW9uKCRlbGVtKXtcbiAgICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdXZWJraXRUcmFuc2l0aW9uJzogJ3dlYmtpdFRyYW5zaXRpb25FbmQnLFxuICAgICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gICAgfTtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICBlbmQ7XG5cbiAgICBmb3IgKHZhciB0IGluIHRyYW5zaXRpb25zKXtcbiAgICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBlbmQgPSB0cmFuc2l0aW9uc1t0XTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoZW5kKXtcbiAgICAgIHJldHVybiBlbmQ7XG4gICAgfWVsc2V7XG4gICAgICBlbmQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICRlbGVtLnRyaWdnZXJIYW5kbGVyKCd0cmFuc2l0aW9uZW5kJywgWyRlbGVtXSk7XG4gICAgICB9LCAxKTtcbiAgICAgIHJldHVybiAndHJhbnNpdGlvbmVuZCc7XG4gICAgfVxuICB9XG59O1xuXG5Gb3VuZGF0aW9uLnV0aWwgPSB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgYXBwbHlpbmcgYSBkZWJvdW5jZSBlZmZlY3QgdG8gYSBmdW5jdGlvbiBjYWxsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyAtIEZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBlbmQgb2YgdGltZW91dC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5IC0gVGltZSBpbiBtcyB0byBkZWxheSB0aGUgY2FsbCBvZiBgZnVuY2AuXG4gICAqIEByZXR1cm5zIGZ1bmN0aW9uXG4gICAqL1xuICB0aHJvdHRsZTogZnVuY3Rpb24gKGZ1bmMsIGRlbGF5KSB7XG4gICAgdmFyIHRpbWVyID0gbnVsbDtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgIGlmICh0aW1lciA9PT0gbnVsbCkge1xuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufTtcblxuLy8gVE9ETzogY29uc2lkZXIgbm90IG1ha2luZyB0aGlzIGEgalF1ZXJ5IGZ1bmN0aW9uXG4vLyBUT0RPOiBuZWVkIHdheSB0byByZWZsb3cgdnMuIHJlLWluaXRpYWxpemVcbi8qKlxuICogVGhlIEZvdW5kYXRpb24galF1ZXJ5IG1ldGhvZC5cbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBtZXRob2QgLSBBbiBhY3Rpb24gdG8gcGVyZm9ybSBvbiB0aGUgY3VycmVudCBqUXVlcnkgb2JqZWN0LlxuICovXG52YXIgZm91bmRhdGlvbiA9IGZ1bmN0aW9uKG1ldGhvZCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBtZXRob2QsXG4gICAgICAkbWV0YSA9ICQoJ21ldGEuZm91bmRhdGlvbi1tcScpLFxuICAgICAgJG5vSlMgPSAkKCcubm8tanMnKTtcblxuICBpZighJG1ldGEubGVuZ3RoKXtcbiAgICAkKCc8bWV0YSBjbGFzcz1cImZvdW5kYXRpb24tbXFcIj4nKS5hcHBlbmRUbyhkb2N1bWVudC5oZWFkKTtcbiAgfVxuICBpZigkbm9KUy5sZW5ndGgpe1xuICAgICRub0pTLnJlbW92ZUNsYXNzKCduby1qcycpO1xuICB9XG5cbiAgaWYodHlwZSA9PT0gJ3VuZGVmaW5lZCcpey8vbmVlZHMgdG8gaW5pdGlhbGl6ZSB0aGUgRm91bmRhdGlvbiBvYmplY3QsIG9yIGFuIGluZGl2aWR1YWwgcGx1Z2luLlxuICAgIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVmbG93KHRoaXMpO1xuICB9ZWxzZSBpZih0eXBlID09PSAnc3RyaW5nJyl7Ly9hbiBpbmRpdmlkdWFsIG1ldGhvZCB0byBpbnZva2Ugb24gYSBwbHVnaW4gb3IgZ3JvdXAgb2YgcGx1Z2luc1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTsvL2NvbGxlY3QgYWxsIHRoZSBhcmd1bWVudHMsIGlmIG5lY2Vzc2FyeVxuICAgIHZhciBwbHVnQ2xhc3MgPSB0aGlzLmRhdGEoJ3pmUGx1Z2luJyk7Ly9kZXRlcm1pbmUgdGhlIGNsYXNzIG9mIHBsdWdpblxuXG4gICAgaWYocGx1Z0NsYXNzICE9PSB1bmRlZmluZWQgJiYgcGx1Z0NsYXNzW21ldGhvZF0gIT09IHVuZGVmaW5lZCl7Ly9tYWtlIHN1cmUgYm90aCB0aGUgY2xhc3MgYW5kIG1ldGhvZCBleGlzdFxuICAgICAgaWYodGhpcy5sZW5ndGggPT09IDEpey8vaWYgdGhlcmUncyBvbmx5IG9uZSwgY2FsbCBpdCBkaXJlY3RseS5cbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseShwbHVnQ2xhc3MsIGFyZ3MpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLCBlbCl7Ly9vdGhlcndpc2UgbG9vcCB0aHJvdWdoIHRoZSBqUXVlcnkgY29sbGVjdGlvbiBhbmQgaW52b2tlIHRoZSBtZXRob2Qgb24gZWFjaFxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KCQoZWwpLmRhdGEoJ3pmUGx1Z2luJyksIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9ZWxzZXsvL2Vycm9yIGZvciBubyBjbGFzcyBvciBubyBtZXRob2RcbiAgICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcIldlJ3JlIHNvcnJ5LCAnXCIgKyBtZXRob2QgKyBcIicgaXMgbm90IGFuIGF2YWlsYWJsZSBtZXRob2QgZm9yIFwiICsgKHBsdWdDbGFzcyA/IGZ1bmN0aW9uTmFtZShwbHVnQ2xhc3MpIDogJ3RoaXMgZWxlbWVudCcpICsgJy4nKTtcbiAgICB9XG4gIH1lbHNley8vZXJyb3IgZm9yIGludmFsaWQgYXJndW1lbnQgdHlwZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFdlJ3JlIHNvcnJ5LCAke3R5cGV9IGlzIG5vdCBhIHZhbGlkIHBhcmFtZXRlci4gWW91IG11c3QgdXNlIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWV0aG9kIHlvdSB3aXNoIHRvIGludm9rZS5gKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbndpbmRvdy5Gb3VuZGF0aW9uID0gRm91bmRhdGlvbjtcbiQuZm4uZm91bmRhdGlvbiA9IGZvdW5kYXRpb247XG5cbi8vIFBvbHlmaWxsIGZvciByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbihmdW5jdGlvbigpIHtcbiAgaWYgKCFEYXRlLm5vdyB8fCAhd2luZG93LkRhdGUubm93KVxuICAgIHdpbmRvdy5EYXRlLm5vdyA9IERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxuICAvKipcbiAgICogUG9seWZpbGwgZm9yIHBlcmZvcm1hbmNlLm5vdywgcmVxdWlyZWQgYnkgckFGXG4gICAqL1xuICBpZighd2luZG93LnBlcmZvcm1hbmNlIHx8ICF3aW5kb3cucGVyZm9ybWFuY2Uubm93KXtcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgICBzdGFydDogRGF0ZS5ub3coKSxcbiAgICAgIG5vdzogZnVuY3Rpb24oKXsgcmV0dXJuIERhdGUubm93KCkgLSB0aGlzLnN0YXJ0OyB9XG4gICAgfTtcbiAgfVxufSkoKTtcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gY2xvc2VzdCB0aGluZyBwb3NzaWJsZSB0byB0aGUgRUNNQVNjcmlwdCA1XG4gICAgICAvLyBpbnRlcm5hbCBJc0NhbGxhYmxlIGZ1bmN0aW9uXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGdW5jdGlvbi5wcm90b3R5cGUuYmluZCAtIHdoYXQgaXMgdHJ5aW5nIHRvIGJlIGJvdW5kIGlzIG5vdCBjYWxsYWJsZScpO1xuICAgIH1cblxuICAgIHZhciBhQXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgZlRvQmluZCA9IHRoaXMsXG4gICAgICAgIGZOT1AgICAgPSBmdW5jdGlvbigpIHt9LFxuICAgICAgICBmQm91bmQgID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGZUb0JpbmQuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGZOT1BcbiAgICAgICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICAgIH07XG5cbiAgICBpZiAodGhpcy5wcm90b3R5cGUpIHtcbiAgICAgIC8vIG5hdGl2ZSBmdW5jdGlvbnMgZG9uJ3QgaGF2ZSBhIHByb3RvdHlwZVxuICAgICAgZk5PUC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICB9XG4gICAgZkJvdW5kLnByb3RvdHlwZSA9IG5ldyBmTk9QKCk7XG5cbiAgICByZXR1cm4gZkJvdW5kO1xuICB9O1xufVxuLy8gUG9seWZpbGwgdG8gZ2V0IHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24gaW4gSUU5XG5mdW5jdGlvbiBmdW5jdGlvbk5hbWUoZm4pIHtcbiAgaWYgKEZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZnVuY05hbWVSZWdleCA9IC9mdW5jdGlvblxccyhbXihdezEsfSlcXCgvO1xuICAgIHZhciByZXN1bHRzID0gKGZ1bmNOYW1lUmVnZXgpLmV4ZWMoKGZuKS50b1N0cmluZygpKTtcbiAgICByZXR1cm4gKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGggPiAxKSA/IHJlc3VsdHNbMV0udHJpbSgpIDogXCJcIjtcbiAgfVxuICBlbHNlIGlmIChmbi5wcm90b3R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmbi5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBmbi5wcm90b3R5cGUuY29uc3RydWN0b3IubmFtZTtcbiAgfVxufVxuZnVuY3Rpb24gcGFyc2VWYWx1ZShzdHIpe1xuICBpZiAoJ3RydWUnID09PSBzdHIpIHJldHVybiB0cnVlO1xuICBlbHNlIGlmICgnZmFsc2UnID09PSBzdHIpIHJldHVybiBmYWxzZTtcbiAgZWxzZSBpZiAoIWlzTmFOKHN0ciAqIDEpKSByZXR1cm4gcGFyc2VGbG9hdChzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuLy8gQ29udmVydCBQYXNjYWxDYXNlIHRvIGtlYmFiLWNhc2Vcbi8vIFRoYW5rIHlvdTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODk1NTU4MFxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuRm91bmRhdGlvbi5Cb3ggPSB7XG4gIEltTm90VG91Y2hpbmdZb3U6IEltTm90VG91Y2hpbmdZb3UsXG4gIEdldERpbWVuc2lvbnM6IEdldERpbWVuc2lvbnMsXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50IHRvIGEgY29udGFpbmVyIGFuZCBkZXRlcm1pbmVzIGNvbGxpc2lvbiBldmVudHMgd2l0aCBjb250YWluZXIuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxuICogQHBhcmFtIHtqUXVlcnl9IHBhcmVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIGJvdW5kaW5nIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbHJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgbGVmdCBhbmQgcmlnaHQgdmFsdWVzIG9ubHkuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxuICogQGRlZmF1bHQgaWYgbm8gcGFyZW50IG9iamVjdCBwYXNzZWQsIGRldGVjdHMgY29sbGlzaW9ucyB3aXRoIGB3aW5kb3dgLlxuICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiBjb2xsaXNpb24gZnJlZSwgZmFsc2UgaWYgYSBjb2xsaXNpb24gaW4gYW55IGRpcmVjdGlvbi5cbiAqL1xuZnVuY3Rpb24gSW1Ob3RUb3VjaGluZ1lvdShlbGVtZW50LCBwYXJlbnQsIGxyT25seSwgdGJPbmx5KSB7XG4gIHZhciBlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcblxuICBpZiAocGFyZW50KSB7XG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XG5cbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gcGFyRGltcy5oZWlnaHQgKyBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gcGFyRGltcy53aWR0aCArIHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0ICsgZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IGVsZURpbXMud2luZG93RGltcy53aWR0aCk7XG4gIH1cblxuICB2YXIgYWxsRGlycyA9IFtib3R0b20sIHRvcCwgbGVmdCwgcmlnaHRdO1xuXG4gIGlmIChsck9ubHkpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgPT09IHRydWU7XG4gIH1cblxuICBpZiAodGJPbmx5KSB7XG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xufTtcblxuLyoqXG4gKiBVc2VzIG5hdGl2ZSBtZXRob2RzIHRvIHJldHVybiBhbiBvYmplY3Qgb2YgZGltZW5zaW9uIHZhbHVlcy5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxuICogQHJldHVybnMge09iamVjdH0gLSBuZXN0ZWQgb2JqZWN0IG9mIGludGVnZXIgcGl4ZWwgdmFsdWVzXG4gKiBUT0RPIC0gaWYgZWxlbWVudCBpcyB3aW5kb3csIHJldHVybiBvbmx5IHRob3NlIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gR2V0RGltZW5zaW9ucyhlbGVtLCB0ZXN0KXtcbiAgZWxlbSA9IGVsZW0ubGVuZ3RoID8gZWxlbVswXSA6IGVsZW07XG5cbiAgaWYgKGVsZW0gPT09IHdpbmRvdyB8fCBlbGVtID09PSBkb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBzb3JyeSwgRGF2ZS4gSSdtIGFmcmFpZCBJIGNhbid0IGRvIHRoYXQuXCIpO1xuICB9XG5cbiAgdmFyIHJlY3QgPSBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblJlY3QgPSBkb2N1bWVudC5ib2R5LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIG9mZnNldDoge1xuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXG4gICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5YXG4gICAgfSxcbiAgICBwYXJlbnREaW1zOiB7XG4gICAgICB3aWR0aDogcGFyUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcGFyUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiBwYXJSZWN0LnRvcCArIHdpblksXG4gICAgICAgIGxlZnQ6IHBhclJlY3QubGVmdCArIHdpblhcbiAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd0RpbXM6IHtcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5SZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHdpblksXG4gICAgICAgIGxlZnQ6IHdpblhcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0b3AgYW5kIGxlZnQgaW50ZWdlciBwaXhlbCB2YWx1ZXMgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmVkIGVsZW1lbnRzLFxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCBiZWluZyBwb3NpdGlvbmVkLlxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gYSBzdHJpbmcgcmVsYXRpbmcgdG8gdGhlIGRlc2lyZWQgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQsIHJlbGF0aXZlIHRvIGl0J3MgYW5jaG9yXG4gKiBAcGFyYW0ge051bWJlcn0gdk9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCB2ZXJ0aWNhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBpc092ZXJmbG93IC0gaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQsIHNldHMgdG8gdHJ1ZSB0byBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIGZ1bGwgd2lkdGggLSBhbnkgZGVzaXJlZCBvZmZzZXQuXG4gKiBUT0RPIGFsdGVyL3Jld3JpdGUgdG8gd29yayB3aXRoIGBlbWAgdmFsdWVzIGFzIHdlbGwvaW5zdGVhZCBvZiBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gR2V0T2Zmc2V0cyhlbGVtZW50LCBhbmNob3IsIHBvc2l0aW9uLCB2T2Zmc2V0LCBoT2Zmc2V0LCBpc092ZXJmbG93KSB7XG4gIHZhciAkZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XG5cbiAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGlzT3ZlcmZsb3cgPyBoT2Zmc2V0IDogKCgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCArIDEsXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQgKyAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JldmVhbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICRlbGVEaW1zLndpZHRoKSAvIDIsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxuICAgICAgfVxuICAgIGNhc2UgJ3JldmVhbCBmdWxsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCAtICRlbGVEaW1zLndpZHRoLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICB9XG59XG5cbn0oalF1ZXJ5KTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogVGhpcyB1dGlsIHdhcyBjcmVhdGVkIGJ5IE1hcml1cyBPbGJlcnR6ICpcbiAqIFBsZWFzZSB0aGFuayBNYXJpdXMgb24gR2l0SHViIC9vd2xiZXJ0eiAqXG4gKiBvciB0aGUgd2ViIGh0dHA6Ly93d3cubWFyaXVzb2xiZXJ0ei5kZS8gKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3Qga2V5Q29kZXMgPSB7XG4gIDk6ICdUQUInLFxuICAxMzogJ0VOVEVSJyxcbiAgMjc6ICdFU0NBUEUnLFxuICAzMjogJ1NQQUNFJyxcbiAgMzc6ICdBUlJPV19MRUZUJyxcbiAgMzg6ICdBUlJPV19VUCcsXG4gIDM5OiAnQVJST1dfUklHSFQnLFxuICA0MDogJ0FSUk9XX0RPV04nXG59XG5cbnZhciBjb21tYW5kcyA9IHt9XG5cbnZhciBLZXlib2FyZCA9IHtcbiAga2V5czogZ2V0S2V5Q29kZXMoa2V5Q29kZXMpLFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIChrZXlib2FyZCkgZXZlbnQgYW5kIHJldHVybnMgYSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIGl0cyBrZXlcbiAgICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcmV0dXJuIFN0cmluZyBrZXkgLSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIHRoZSBrZXkgcHJlc3NlZFxuICAgKi9cbiAgcGFyc2VLZXkoZXZlbnQpIHtcbiAgICB2YXIga2V5ID0ga2V5Q29kZXNbZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZV0gfHwgU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCkudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIFJlbW92ZSB1bi1wcmludGFibGUgY2hhcmFjdGVycywgZS5nLiBmb3IgYGZyb21DaGFyQ29kZWAgY2FsbHMgZm9yIENUUkwgb25seSBldmVudHNcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXFxXKy8sICcnKTtcblxuICAgIGlmIChldmVudC5zaGlmdEtleSkga2V5ID0gYFNISUZUXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmN0cmxLZXkpIGtleSA9IGBDVFJMXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmFsdEtleSkga2V5ID0gYEFMVF8ke2tleX1gO1xuXG4gICAgLy8gUmVtb3ZlIHRyYWlsaW5nIHVuZGVyc2NvcmUsIGluIGNhc2Ugb25seSBtb2RpZmllcnMgd2VyZSB1c2VkIChlLmcuIG9ubHkgYENUUkxfQUxUYClcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXyQvLCAnJyk7XG5cbiAgICByZXR1cm4ga2V5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBnaXZlbiAoa2V5Ym9hcmQpIGV2ZW50XG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQncyBuYW1lLCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHBhcmFtIHtPYmplY3RzfSBmdW5jdGlvbnMgLSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSB0byBiZSBleGVjdXRlZFxuICAgKi9cbiAgaGFuZGxlS2V5KGV2ZW50LCBjb21wb25lbnQsIGZ1bmN0aW9ucykge1xuICAgIHZhciBjb21tYW5kTGlzdCA9IGNvbW1hbmRzW2NvbXBvbmVudF0sXG4gICAgICBrZXlDb2RlID0gdGhpcy5wYXJzZUtleShldmVudCksXG4gICAgICBjbWRzLFxuICAgICAgY29tbWFuZCxcbiAgICAgIGZuO1xuXG4gICAgaWYgKCFjb21tYW5kTGlzdCkgcmV0dXJuIGNvbnNvbGUud2FybignQ29tcG9uZW50IG5vdCBkZWZpbmVkIScpO1xuXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kTGlzdC5sdHIgPT09ICd1bmRlZmluZWQnKSB7IC8vIHRoaXMgY29tcG9uZW50IGRvZXMgbm90IGRpZmZlcmVudGlhdGUgYmV0d2VlbiBsdHIgYW5kIHJ0bFxuICAgICAgICBjbWRzID0gY29tbWFuZExpc3Q7IC8vIHVzZSBwbGFpbiBsaXN0XG4gICAgfSBlbHNlIHsgLy8gbWVyZ2UgbHRyIGFuZCBydGw6IGlmIGRvY3VtZW50IGlzIHJ0bCwgcnRsIG92ZXJ3cml0ZXMgbHRyIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0Lmx0ciwgY29tbWFuZExpc3QucnRsKTtcblxuICAgICAgICBlbHNlIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QucnRsLCBjb21tYW5kTGlzdC5sdHIpO1xuICAgIH1cbiAgICBjb21tYW5kID0gY21kc1trZXlDb2RlXTtcblxuICAgIGZuID0gZnVuY3Rpb25zW2NvbW1hbmRdO1xuICAgIGlmIChmbiAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiAgaWYgZXhpc3RzXG4gICAgICB2YXIgcmV0dXJuVmFsdWUgPSBmbi5hcHBseSgpO1xuICAgICAgaWYgKGZ1bmN0aW9ucy5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMuaGFuZGxlZChyZXR1cm5WYWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdW5jdGlvbnMudW5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMudW5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgbm90IGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMudW5oYW5kbGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gYCRlbGVtZW50YFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHNlYXJjaCB3aXRoaW5cbiAgICogQHJldHVybiB7alF1ZXJ5fSAkZm9jdXNhYmxlIC0gYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gYCRlbGVtZW50YFxuICAgKi9cbiAgZmluZEZvY3VzYWJsZSgkZWxlbWVudCkge1xuICAgIGlmKCEkZWxlbWVudCkge3JldHVybiBmYWxzZTsgfVxuICAgIHJldHVybiAkZWxlbWVudC5maW5kKCdhW2hyZWZdLCBhcmVhW2hyZWZdLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIHNlbGVjdDpub3QoW2Rpc2FibGVkXSksIHRleHRhcmVhOm5vdChbZGlzYWJsZWRdKSwgYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCAqW3RhYmluZGV4XSwgKltjb250ZW50ZWRpdGFibGVdJykuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEkKHRoaXMpLmlzKCc6dmlzaWJsZScpIHx8ICQodGhpcykuYXR0cigndGFiaW5kZXgnKSA8IDApIHsgcmV0dXJuIGZhbHNlOyB9IC8vb25seSBoYXZlIHZpc2libGUgZWxlbWVudHMgYW5kIHRob3NlIHRoYXQgaGF2ZSBhIHRhYmluZGV4IGdyZWF0ZXIgb3IgZXF1YWwgMFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGNvbXBvbmVudCBuYW1lIG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50LCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHJldHVybiBTdHJpbmcgY29tcG9uZW50TmFtZVxuICAgKi9cblxuICByZWdpc3Rlcihjb21wb25lbnROYW1lLCBjbWRzKSB7XG4gICAgY29tbWFuZHNbY29tcG9uZW50TmFtZV0gPSBjbWRzO1xuICB9LCAgXG5cbiAgLyoqXG4gICAqIFRyYXBzIHRoZSBmb2N1cyBpbiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSAkZWxlbWVudCAgalF1ZXJ5IG9iamVjdCB0byB0cmFwIHRoZSBmb3VjcyBpbnRvLlxuICAgKi9cbiAgdHJhcEZvY3VzKCRlbGVtZW50KSB7XG4gICAgdmFyICRmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoJGVsZW1lbnQpLFxuICAgICAgICAkZmlyc3RGb2N1c2FibGUgPSAkZm9jdXNhYmxlLmVxKDApLFxuICAgICAgICAkbGFzdEZvY3VzYWJsZSA9ICRmb2N1c2FibGUuZXEoLTEpO1xuXG4gICAgJGVsZW1lbnQub24oJ2tleWRvd24uemYudHJhcGZvY3VzJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgPT09ICRsYXN0Rm9jdXNhYmxlWzBdICYmIEZvdW5kYXRpb24uS2V5Ym9hcmQucGFyc2VLZXkoZXZlbnQpID09PSAnVEFCJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkZmlyc3RGb2N1c2FibGUuZm9jdXMoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGV2ZW50LnRhcmdldCA9PT0gJGZpcnN0Rm9jdXNhYmxlWzBdICYmIEZvdW5kYXRpb24uS2V5Ym9hcmQucGFyc2VLZXkoZXZlbnQpID09PSAnU0hJRlRfVEFCJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkbGFzdEZvY3VzYWJsZS5mb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVsZWFzZXMgdGhlIHRyYXBwZWQgZm9jdXMgZnJvbSB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSAkZWxlbWVudCAgalF1ZXJ5IG9iamVjdCB0byByZWxlYXNlIHRoZSBmb2N1cyBmb3IuXG4gICAqL1xuICByZWxlYXNlRm9jdXMoJGVsZW1lbnQpIHtcbiAgICAkZWxlbWVudC5vZmYoJ2tleWRvd24uemYudHJhcGZvY3VzJyk7XG4gIH1cbn1cblxuLypcbiAqIENvbnN0YW50cyBmb3IgZWFzaWVyIGNvbXBhcmluZy5cbiAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICovXG5mdW5jdGlvbiBnZXRLZXlDb2RlcyhrY3MpIHtcbiAgdmFyIGsgPSB7fTtcbiAgZm9yICh2YXIga2MgaW4ga2NzKSBrW2tjc1trY11dID0ga2NzW2tjXTtcbiAgcmV0dXJuIGs7XG59XG5cbkZvdW5kYXRpb24uS2V5Ym9hcmQgPSBLZXlib2FyZDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vLyBEZWZhdWx0IHNldCBvZiBtZWRpYSBxdWVyaWVzXG5jb25zdCBkZWZhdWx0UXVlcmllcyA9IHtcbiAgJ2RlZmF1bHQnIDogJ29ubHkgc2NyZWVuJyxcbiAgbGFuZHNjYXBlIDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICBwb3J0cmFpdCA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICByZXRpbmEgOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxudmFyIE1lZGlhUXVlcnkgPSB7XG4gIHF1ZXJpZXM6IFtdLFxuXG4gIGN1cnJlbnQ6ICcnLFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbWVkaWEgcXVlcnkgaGVscGVyLCBieSBleHRyYWN0aW5nIHRoZSBicmVha3BvaW50IGxpc3QgZnJvbSB0aGUgQ1NTIGFuZCBhY3RpdmF0aW5nIHRoZSBicmVha3BvaW50IHdhdGNoZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleHRyYWN0ZWRTdHlsZXMgPSAkKCcuZm91bmRhdGlvbi1tcScpLmNzcygnZm9udC1mYW1pbHknKTtcbiAgICB2YXIgbmFtZWRRdWVyaWVzO1xuXG4gICAgbmFtZWRRdWVyaWVzID0gcGFyc2VTdHlsZVRvT2JqZWN0KGV4dHJhY3RlZFN0eWxlcyk7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZWRRdWVyaWVzKSB7XG4gICAgICBpZihuYW1lZFF1ZXJpZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzZWxmLnF1ZXJpZXMucHVzaCh7XG4gICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgIHZhbHVlOiBgb25seSBzY3JlZW4gYW5kIChtaW4td2lkdGg6ICR7bmFtZWRRdWVyaWVzW2tleV19KWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKTtcblxuICAgIHRoaXMuX3dhdGNoZXIoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gaXMgYXQgbGVhc3QgYXMgd2lkZSBhcyBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCdzIHNtYWxsZXIuXG4gICAqL1xuICBhdExlYXN0KHNpemUpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLmdldChzaXplKTtcblxuICAgIGlmIChxdWVyeSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KS5tYXRjaGVzO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gbWF0Y2hlcyB0byBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2ssIGVpdGhlciAnc21hbGwgb25seScgb3IgJ3NtYWxsJy4gT21pdHRpbmcgJ29ubHknIGZhbGxzIGJhY2sgdG8gdXNpbmcgYXRMZWFzdCgpIG1ldGhvZC5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LlxuICAgKi9cbiAgaXMoc2l6ZSkge1xuICAgIHNpemUgPSBzaXplLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgIGlmKHNpemUubGVuZ3RoID4gMSAmJiBzaXplWzFdID09PSAnb25seScpIHtcbiAgICAgIGlmKHNpemVbMF0gPT09IHRoaXMuX2dldEN1cnJlbnRTaXplKCkpIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5hdExlYXN0KHNpemVbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1lZGlhIHF1ZXJ5IG9mIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8bnVsbH0gLSBUaGUgbWVkaWEgcXVlcnkgb2YgdGhlIGJyZWFrcG9pbnQsIG9yIGBudWxsYCBpZiB0aGUgYnJlYWtwb2ludCBkb2Vzbid0IGV4aXN0LlxuICAgKi9cbiAgZ2V0KHNpemUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcmllcykge1xuICAgICAgaWYodGhpcy5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcbiAgICAgICAgaWYgKHNpemUgPT09IHF1ZXJ5Lm5hbWUpIHJldHVybiBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudCBicmVha3BvaW50IG5hbWUgYnkgdGVzdGluZyBldmVyeSBicmVha3BvaW50IGFuZCByZXR1cm5pbmcgdGhlIGxhc3Qgb25lIHRvIG1hdGNoICh0aGUgYmlnZ2VzdCBvbmUpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge1N0cmluZ30gTmFtZSBvZiB0aGUgY3VycmVudCBicmVha3BvaW50LlxuICAgKi9cbiAgX2dldEN1cnJlbnRTaXplKCkge1xuICAgIHZhciBtYXRjaGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnF1ZXJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcblxuICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5LnZhbHVlKS5tYXRjaGVzKSB7XG4gICAgICAgIG1hdGNoZWQgPSBxdWVyeTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZC5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFjdGl2YXRlcyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLCB3aGljaCBmaXJlcyBhbiBldmVudCBvbiB0aGUgd2luZG93IHdoZW5ldmVyIHRoZSBicmVha3BvaW50IGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3dhdGNoZXIoKSB7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYubWVkaWFxdWVyeScsICgpID0+IHtcbiAgICAgIHZhciBuZXdTaXplID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKSwgY3VycmVudFNpemUgPSB0aGlzLmN1cnJlbnQ7XG5cbiAgICAgIGlmIChuZXdTaXplICE9PSBjdXJyZW50U2l6ZSkge1xuICAgICAgICAvLyBDaGFuZ2UgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnlcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbmV3U2l6ZTtcblxuICAgICAgICAvLyBCcm9hZGNhc3QgdGhlIG1lZGlhIHF1ZXJ5IGNoYW5nZSBvbiB0aGUgd2luZG93XG4gICAgICAgICQod2luZG93KS50cmlnZ2VyKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBbbmV3U2l6ZSwgY3VycmVudFNpemVdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxuLy8gbWF0Y2hNZWRpYSgpIHBvbHlmaWxsIC0gVGVzdCBhIENTUyBtZWRpYSB0eXBlL3F1ZXJ5IGluIEpTLlxuLy8gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2VcbndpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSA9IGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBtYXRjaE1lZGl1bSBhcGkgc3VjaCBhcyBJRSA5IGFuZCB3ZWJraXRcbiAgdmFyIHN0eWxlTWVkaWEgPSAod2luZG93LnN0eWxlTWVkaWEgfHwgd2luZG93Lm1lZGlhKTtcblxuICAvLyBGb3IgdGhvc2UgdGhhdCBkb24ndCBzdXBwb3J0IG1hdGNoTWVkaXVtXG4gIGlmICghc3R5bGVNZWRpYSkge1xuICAgIHZhciBzdHlsZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKSxcbiAgICBzY3JpcHQgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXSxcbiAgICBpbmZvICAgICAgICA9IG51bGw7XG5cbiAgICBzdHlsZS50eXBlICA9ICd0ZXh0L2Nzcyc7XG4gICAgc3R5bGUuaWQgICAgPSAnbWF0Y2htZWRpYWpzLXRlc3QnO1xuXG4gICAgc2NyaXB0ICYmIHNjcmlwdC5wYXJlbnROb2RlICYmIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdHlsZSwgc2NyaXB0KTtcblxuICAgIC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgaW5mbyA9ICgnZ2V0Q29tcHV0ZWRTdHlsZScgaW4gd2luZG93KSAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuXG4gICAgc3R5bGVNZWRpYSA9IHtcbiAgICAgIG1hdGNoTWVkaXVtKG1lZGlhKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcblxuICAgICAgICAvLyAnc3R5bGUuc3R5bGVTaGVldCcgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnc3R5bGUudGV4dENvbnRlbnQnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSB0ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IHN0eWxlTWVkaWEubWF0Y2hNZWRpdW0obWVkaWEgfHwgJ2FsbCcpLFxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXG4gICAgfTtcbiAgfVxufSgpKTtcblxuLy8gVGhhbmsgeW91OiBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xuICB2YXIgc3R5bGVPYmplY3QgPSB7fTtcblxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHIgPSBzdHIudHJpbSgpLnNsaWNlKDEsIC0xKTsgLy8gYnJvd3NlcnMgcmUtcXVvdGUgc3RyaW5nIHN0eWxlIHZhbHVlc1xuXG4gIGlmICghc3RyKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3R5bGVPYmplY3QgPSBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocmV0LCBwYXJhbSkge1xuICAgIHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWwgPSBwYXJ0c1sxXTtcbiAgICBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuICAgIC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG4gICAgLy8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgaWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuICAgICAgcmV0W2tleV0ucHVzaCh2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSwge30pO1xuXG4gIHJldHVybiBzdHlsZU9iamVjdDtcbn1cblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1vdGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXG4gKi9cblxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xuY29uc3QgYWN0aXZlQ2xhc3NlcyA9IFsnbXVpLWVudGVyLWFjdGl2ZScsICdtdWktbGVhdmUtYWN0aXZlJ107XG5cbmNvbnN0IE1vdGlvbiA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW92ZShkdXJhdGlvbiwgZWxlbSwgZm4pe1xuICB2YXIgYW5pbSwgcHJvZywgc3RhcnQgPSBudWxsO1xuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XG5cbiAgaWYgKGR1cmF0aW9uID09PSAwKSB7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG4gICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gbW92ZSh0cyl7XG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHRzO1xuICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0LCB0cyk7XG4gICAgcHJvZyA9IHRzIC0gc3RhcnQ7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG5cbiAgICBpZihwcm9nIDwgZHVyYXRpb24peyBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlLCBlbGVtKTsgfVxuICAgIGVsc2V7XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbSk7XG4gICAgICBlbGVtLnRyaWdnZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pLnRyaWdnZXJIYW5kbGVyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKTtcbiAgICB9XG4gIH1cbiAgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSk7XG59XG5cbi8qKlxuICogQW5pbWF0ZXMgYW4gZWxlbWVudCBpbiBvciBvdXQgdXNpbmcgYSBDU1MgdHJhbnNpdGlvbiBjbGFzcy5cbiAqIEBmdW5jdGlvblxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNJbiAtIERlZmluZXMgaWYgdGhlIGFuaW1hdGlvbiBpcyBpbiBvciBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvciBIVE1MIG9iamVjdCB0byBhbmltYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IGFuaW1hdGlvbiAtIENTUyBjbGFzcyB0byB1c2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIENhbGxiYWNrIHRvIHJ1biB3aGVuIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC5cbiAqL1xuZnVuY3Rpb24gYW5pbWF0ZShpc0luLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gIGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApO1xuXG4gIGlmICghZWxlbWVudC5sZW5ndGgpIHJldHVybjtcblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuXG4gIGVsZW1lbnRcbiAgICAuYWRkQ2xhc3MoYW5pbWF0aW9uKVxuICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnbm9uZScpO1xuXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhpbml0Q2xhc3MpO1xuICAgIGlmIChpc0luKSBlbGVtZW50LnNob3coKTtcbiAgfSk7XG5cbiAgLy8gU3RhcnQgdGhlIGFuaW1hdGlvblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudFxuICAgICAgLmNzcygndHJhbnNpdGlvbicsICcnKVxuICAgICAgLmFkZENsYXNzKGFjdGl2ZUNsYXNzKTtcbiAgfSk7XG5cbiAgLy8gQ2xlYW4gdXAgdGhlIGFuaW1hdGlvbiB3aGVuIGl0IGZpbmlzaGVzXG4gIGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZChlbGVtZW50KSwgZmluaXNoKTtcblxuICAvLyBIaWRlcyB0aGUgZWxlbWVudCAoZm9yIG91dCBhbmltYXRpb25zKSwgcmVzZXRzIHRoZSBlbGVtZW50LCBhbmQgcnVucyBhIGNhbGxiYWNrXG4gIGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICBpZiAoIWlzSW4pIGVsZW1lbnQuaGlkZSgpO1xuICAgIHJlc2V0KCk7XG4gICAgaWYgKGNiKSBjYi5hcHBseShlbGVtZW50KTtcbiAgfVxuXG4gIC8vIFJlc2V0cyB0cmFuc2l0aW9ucyBhbmQgcmVtb3ZlcyBtb3Rpb24tc3BlY2lmaWMgY2xhc3Nlc1xuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBlbGVtZW50WzBdLnN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9IDA7XG4gICAgZWxlbWVudC5yZW1vdmVDbGFzcyhgJHtpbml0Q2xhc3N9ICR7YWN0aXZlQ2xhc3N9ICR7YW5pbWF0aW9ufWApO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTW92ZSA9IE1vdmU7XG5Gb3VuZGF0aW9uLk1vdGlvbiA9IE1vdGlvbjtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBOZXN0ID0ge1xuICBGZWF0aGVyKG1lbnUsIHR5cGUgPSAnemYnKSB7XG4gICAgbWVudS5hdHRyKCdyb2xlJywgJ21lbnViYXInKTtcblxuICAgIHZhciBpdGVtcyA9IG1lbnUuZmluZCgnbGknKS5hdHRyKHsncm9sZSc6ICdtZW51aXRlbSd9KSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuXG4gICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW1cbiAgICAgICAgICAuYWRkQ2xhc3MoaGFzU3ViQ2xhc3MpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAkaXRlbS5jaGlsZHJlbignYTpmaXJzdCcpLnRleHQoKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIE5vdGU6ICBEcmlsbGRvd25zIGJlaGF2ZSBkaWZmZXJlbnRseSBpbiBob3cgdGhleSBoaWRlLCBhbmQgc28gbmVlZFxuICAgICAgICAgIC8vIGFkZGl0aW9uYWwgYXR0cmlidXRlcy4gIFdlIHNob3VsZCBsb29rIGlmIHRoaXMgcG9zc2libHkgb3Zlci1nZW5lcmFsaXplZFxuICAgICAgICAgIC8vIHV0aWxpdHkgKE5lc3QpIGlzIGFwcHJvcHJpYXRlIHdoZW4gd2UgcmV3b3JrIG1lbnVzIGluIDYuNFxuICAgICAgICAgIGlmKHR5cGUgPT09ICdkcmlsbGRvd24nKSB7XG4gICAgICAgICAgICAkaXRlbS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IGZhbHNlfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICRzdWJcbiAgICAgICAgICAuYWRkQ2xhc3MoYHN1Ym1lbnUgJHtzdWJNZW51Q2xhc3N9YClcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZGF0YS1zdWJtZW51JzogJycsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgICBpZih0eXBlID09PSAnZHJpbGxkb3duJykge1xuICAgICAgICAgICRzdWIuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICgkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgQnVybihtZW51LCB0eXBlKSB7XG4gICAgdmFyIC8vaXRlbXMgPSBtZW51LmZpbmQoJ2xpJyksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnVcbiAgICAgIC5maW5kKCc+bGksIC5tZW51LCAubWVudSA+IGxpJylcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxuICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpLmNzcygnZGlzcGxheScsICcnKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUNsYXNzKHN1Yk1lbnVDbGFzcyArICcgJyArIHN1Ykl0ZW1DbGFzcyArICcgaGFzLXN1Ym1lbnUgaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUnKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykpO1xuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAvLyAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgLy8gICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdpcy1zdWJtZW51LWl0ZW0gJyArIHN1Ykl0ZW1DbGFzcyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdoYXMtc3VibWVudScpO1xuICAgIC8vICAgICAkc3ViLnJlbW92ZUNsYXNzKCdzdWJtZW51ICcgKyBzdWJNZW51Q2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTmVzdCA9IE5lc3Q7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcbiAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiwvL29wdGlvbnMgaXMgYW4gb2JqZWN0IGZvciBlYXNpbHkgYWRkaW5nIGZlYXR1cmVzIGxhdGVyLlxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXG4gICAgICByZW1haW4gPSAtMSxcbiAgICAgIHN0YXJ0LFxuICAgICAgdGltZXI7XG5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuXG4gIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlbWFpbiA9IC0xO1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiA8PSAwID8gZHVyYXRpb24gOiByZW1haW47XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XG4gICAgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XG4gICAgICAgIF90aGlzLnJlc3RhcnQoKTsvL3JlcnVuIHRoZSB0aW1lci5cbiAgICAgIH1cbiAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICAgIH0sIHJlbWFpbik7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnN0YXJ0LnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG5cbiAgdGhpcy5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSB0cnVlO1xuICAgIC8vaWYoZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgdHJ1ZSk7XG4gICAgdmFyIGVuZCA9IERhdGUubm93KCk7XG4gICAgcmVtYWluID0gcmVtYWluIC0gKGVuZCAtIHN0YXJ0KTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVycGF1c2VkLnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG59XG5cbi8qKlxuICogUnVucyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gaW1hZ2VzIGFyZSBmdWxseSBsb2FkZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gaW1hZ2VzIC0gSW1hZ2UocykgdG8gY2hlY2sgaWYgbG9hZGVkLlxuICogQHBhcmFtIHtGdW5jfSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBpbWFnZSBpcyBmdWxseSBsb2FkZWQuXG4gKi9cbmZ1bmN0aW9uIG9uSW1hZ2VzTG9hZGVkKGltYWdlcywgY2FsbGJhY2spe1xuICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICB1bmxvYWRlZCA9IGltYWdlcy5sZW5ndGg7XG5cbiAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxuXG4gIGltYWdlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIC8vIENoZWNrIGlmIGltYWdlIGlzIGxvYWRlZFxuICAgIGlmICh0aGlzLmNvbXBsZXRlIHx8ICh0aGlzLnJlYWR5U3RhdGUgPT09IDQpIHx8ICh0aGlzLnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICAvLyBGb3JjZSBsb2FkIHRoZSBpbWFnZVxuICAgIGVsc2Uge1xuICAgICAgLy8gZml4IGZvciBJRS4gU2VlIGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vc25pcHBldHMvanF1ZXJ5L2ZpeGluZy1sb2FkLWluLWllLWZvci1jYWNoZWQtaW1hZ2VzL1xuICAgICAgdmFyIHNyYyA9ICQodGhpcykuYXR0cignc3JjJyk7XG4gICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIHNyYyArIChzcmMuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSk7XG4gICAgICAkKHRoaXMpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBzaW5nbGVJbWFnZUxvYWRlZCgpIHtcbiAgICB1bmxvYWRlZC0tO1xuICAgIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbn1cblxuRm91bmRhdGlvbi5UaW1lciA9IFRpbWVyO1xuRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCA9IG9uSW1hZ2VzTG9hZGVkO1xuXG59KGpRdWVyeSk7XG4iLCIvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXG4vLyoqRG9uZSBieSBZb2hhaSBBcmFyYXQgKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4oZnVuY3Rpb24oJCkge1xuXG4gICQuc3BvdFN3aXBlID0ge1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgZW5hYmxlZDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIHByZXZlbnREZWZhdWx0OiBmYWxzZSxcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcbiAgICB0aW1lVGhyZXNob2xkOiAyMDBcbiAgfTtcblxuICB2YXIgICBzdGFydFBvc1gsXG4gICAgICAgIHN0YXJ0UG9zWSxcbiAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICBlbGFwc2VkVGltZSxcbiAgICAgICAgaXNNb3ZpbmcgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRvdWNoRW5kKCkge1xuICAgIC8vICBhbGVydCh0aGlzKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCk7XG4gICAgaXNNb3ZpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGUpIHtcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgaWYoaXNNb3ZpbmcpIHtcbiAgICAgIHZhciB4ID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICB2YXIgZHggPSBzdGFydFBvc1ggLSB4O1xuICAgICAgdmFyIGR5ID0gc3RhcnRQb3NZIC0geTtcbiAgICAgIHZhciBkaXI7XG4gICAgICBlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgaWYoTWF0aC5hYnMoZHgpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgICAgfVxuICAgICAgLy8gZWxzZSBpZihNYXRoLmFicyhkeSkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XG4gICAgICAvLyB9XG4gICAgICBpZihkaXIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBvblRvdWNoRW5kLmNhbGwodGhpcyk7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignc3dpcGUnLCBkaXIpLnRyaWdnZXIoYHN3aXBlJHtkaXJ9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGUpIHtcbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICBzdGFydFBvc1kgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICBpc01vdmluZyA9IHRydWU7XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUsIGZhbHNlKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgJiYgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZWFyZG93bigpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpO1xuICB9XG5cbiAgJC5ldmVudC5zcGVjaWFsLnN3aXBlID0geyBzZXR1cDogaW5pdCB9O1xuXG4gICQuZWFjaChbJ2xlZnQnLCAndXAnLCAnZG93bicsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XG4gICAgJC5ldmVudC5zcGVjaWFsW2Bzd2lwZSR7dGhpc31gXSA9IHsgc2V0dXA6IGZ1bmN0aW9uKCl7XG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XG4gICAgfSB9O1xuICB9KTtcbn0pKGpRdWVyeSk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWV0aG9kIGZvciBhZGRpbmcgcHN1ZWRvIGRyYWcgZXZlbnRzIHRvIGVsZW1lbnRzICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4hZnVuY3Rpb24oJCl7XG4gICQuZm4uYWRkVG91Y2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICQoZWwpLmJpbmQoJ3RvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJyxmdW5jdGlvbigpe1xuICAgICAgICAvL3dlIHBhc3MgdGhlIG9yaWdpbmFsIGV2ZW50IG9iamVjdCBiZWNhdXNlIHRoZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxuICAgICAgICBoYW5kbGVUb3VjaChldmVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3VjaCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgZmlyc3QgPSB0b3VjaGVzWzBdLFxuICAgICAgICAgIGV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgIHRvdWNobW92ZTogJ21vdXNlbW92ZScsXG4gICAgICAgICAgICB0b3VjaGVuZDogJ21vdXNldXAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0eXBlID0gZXZlbnRUeXBlc1tldmVudC50eXBlXSxcbiAgICAgICAgICBzaW11bGF0ZWRFdmVudFxuICAgICAgICA7XG5cbiAgICAgIGlmKCdNb3VzZUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5Nb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgJ2NhbmNlbGFibGUnOiB0cnVlLFxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcbiAgICAgICAgICAnc2NyZWVuWSc6IGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgJ2NsaWVudFgnOiBmaXJzdC5jbGllbnRYLFxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCBmaXJzdC5zY3JlZW5YLCBmaXJzdC5zY3JlZW5ZLCBmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMC8qbGVmdCovLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICB9O1xuICB9O1xufShqUXVlcnkpO1xuXG5cbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKkZyb20gdGhlIGpRdWVyeSBNb2JpbGUgTGlicmFyeSoqXG4vLyoqbmVlZCB0byByZWNyZWF0ZSBmdW5jdGlvbmFsaXR5Kipcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XG5cblx0dmFyICRkb2N1bWVudCA9ICQoIGRvY3VtZW50ICksXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcblx0XHR0b3VjaFN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIixcblx0XHR0b3VjaFN0b3BFdmVudCA9ICd0b3VjaGVuZCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiLFxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuXG5cdC8vIHNldHVwIG5ldyBldmVudCBzaG9ydGN1dHNcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xuXHRcdFwic3dpcGUgc3dpcGVsZWZ0IHN3aXBlcmlnaHRcIiApLnNwbGl0KCBcIiBcIiApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdHJldHVybiBmbiA/IHRoaXMuYmluZCggbmFtZSwgZm4gKSA6IHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHRcdH07XG5cblx0XHQvLyBqUXVlcnkgPCAxLjhcblx0XHRpZiAoICQuYXR0ckZuICkge1xuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0cmlnZ2VyQ3VzdG9tRXZlbnQoIG9iaiwgZXZlbnRUeXBlLCBldmVudCwgYnViYmxlICkge1xuXHRcdHZhciBvcmlnaW5hbFR5cGUgPSBldmVudC50eXBlO1xuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XG5cdFx0aWYgKCBidWJibGUgKSB7XG5cdFx0XHQkLmV2ZW50LnRyaWdnZXIoIGV2ZW50LCB1bmRlZmluZWQsIG9iaiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkLmV2ZW50LmRpc3BhdGNoLmNhbGwoIG9iaiwgZXZlbnQgKTtcblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcblx0fVxuXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXG5cblx0Ly8gQWxzbyBoYW5kbGVzIHN3aXBlbGVmdCwgc3dpcGVyaWdodFxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XG5cblx0XHQvLyBNb3JlIHRoYW4gdGhpcyBob3Jpem9udGFsIGRpc3BsYWNlbWVudCwgYW5kIHdlIHdpbGwgc3VwcHJlc3Mgc2Nyb2xsaW5nLlxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxuXG5cdFx0Ly8gTW9yZSB0aW1lIHRoYW4gdGhpcywgYW5kIGl0IGlzbid0IGEgc3dpcGUuXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXG5cblx0XHQvLyBTd2lwZSBob3Jpem9udGFsIGRpc3BsYWNlbWVudCBtdXN0IGJlIG1vcmUgdGhhbiB0aGlzLlxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHQvLyBTd2lwZSB2ZXJ0aWNhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBsZXNzIHRoYW4gdGhpcy5cblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdGdldExvY2F0aW9uOiBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxuXHRcdFx0XHR3aW5QYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRcdFx0eCA9IGV2ZW50LmNsaWVudFgsXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRpZiAoIGV2ZW50LnBhZ2VZID09PSAwICYmIE1hdGguZmxvb3IoIHkgKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VZICkgfHxcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBpT1M0IGNsaWVudFgvY2xpZW50WSBoYXZlIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBoYXZlIGJlZW5cblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcblx0XHRcdFx0eCA9IHggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IHkgLSB3aW5QYWdlWTtcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBTb21lIEFuZHJvaWQgYnJvd3NlcnMgaGF2ZSB0b3RhbGx5IGJvZ3VzIHZhbHVlcyBmb3IgY2xpZW50WC9ZXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxuXHRcdFx0XHQvLyBzaG91bGQgbmV2ZXIgYmUgc21hbGxlciB0aGFuIHBhZ2VYL3BhZ2VZIG1pbnVzIHBhZ2Ugc2Nyb2xsXG5cdFx0XHRcdHggPSBldmVudC5wYWdlWCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXG5cdFx0XHRcdFx0XHRvcmlnaW46ICQoIGV2ZW50LnRhcmdldCApXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XG5cdFx0XHRpZiAoIHN0b3AudGltZSAtIHN0YXJ0LnRpbWUgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZHVyYXRpb25UaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IHN0YXJ0LmNvb3Jkc1swXSA+IHN0b3AuY29vcmRzWyAwIF0gPyBcInN3aXBlbGVmdFwiIDogXCJzd2lwZXJpZ2h0XCI7XG5cblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBkaXJlY3Rpb24sJC5FdmVudCggZGlyZWN0aW9uLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9ICksIHRydWUgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHR9LFxuXG5cdFx0Ly8gVGhpcyBzZXJ2ZXMgYXMgYSBmbGFnIHRvIGVuc3VyZSB0aGF0IGF0IG1vc3Qgb25lIHN3aXBlIGV2ZW50IGV2ZW50IGlzXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxuXHRcdGV2ZW50SW5Qcm9ncmVzczogZmFsc2UsXG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLFxuXHRcdFx0XHR0aGlzT2JqZWN0ID0gdGhpcyxcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXG5cdFx0XHRcdGNvbnRleHQgPSB7fTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiLCBldmVudHMgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcblx0XHRcdGV2ZW50cy5zd2lwZSA9IGNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHRcdFx0Ly8gQmFpbCBpZiB3ZSdyZSBhbHJlYWR5IHdvcmtpbmcgb24gYSBzd2lwZSBldmVudFxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdHZhciBzdG9wLFxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxuXHRcdFx0XHRcdG9yaWdUYXJnZXQgPSBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0ZW1pdHRlZCA9IGZhbHNlO1xuXG5cdFx0XHRcdGNvbnRleHQubW92ZSA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRpZiAoICFzdGFydCB8fCBldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKCAhZW1pdHRlZCApIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaGFuZGxlU3dpcGUoIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcblx0XHRcdFx0XHRpZiAoIE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXG5cdFx0XHRcdFx0Lm9uZSggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0fTtcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHR9LFxuXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cywgY29udGV4dDtcblxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCBldmVudHMgKSB7XG5cdFx0XHRcdGNvbnRleHQgPSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGV2ZW50cy5sZW5ndGgtLTtcblx0XHRcdFx0aWYgKCBldmVudHMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRcdGlmICggY29udGV4dC5zdGFydCApIHtcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQubW92ZSApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0b3AgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHQkLmVhY2goe1xuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXG5cdFx0c3dpcGVyaWdodDogXCJzd2lwZS5yaWdodFwiXG5cdH0sIGZ1bmN0aW9uKCBldmVudCwgc291cmNlRXZlbnQgKSB7XG5cblx0XHQkLmV2ZW50LnNwZWNpYWxbIGV2ZW50IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoIGpRdWVyeSwgdGhpcyApO1xuKi9cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYCBpbiB3aW5kb3cpIHtcbiAgICAgIHJldHVybiB3aW5kb3dbYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KCkpO1xuXG5jb25zdCB0cmlnZ2VycyA9IChlbCwgdHlwZSkgPT4ge1xuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XG4gICAgJChgIyR7aWR9YClbIHR5cGUgPT09ICdjbG9zZScgPyAndHJpZ2dlcicgOiAndHJpZ2dlckhhbmRsZXInXShgJHt0eXBlfS56Zi50cmlnZ2VyYCwgW2VsXSk7XG4gIH0pO1xufTtcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtb3Blbl0gd2lsbCByZXZlYWwgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1vcGVuXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4vLyBJZiB1c2VkIHdpdGhvdXQgYSB2YWx1ZSBvbiBbZGF0YS1jbG9zZV0sIHRoZSBldmVudCB3aWxsIGJ1YmJsZSwgYWxsb3dpbmcgaXQgdG8gY2xvc2UgYSBwYXJlbnQgY29tcG9uZW50LlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2VdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ2Nsb3NlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGVdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICd0b2dnbGUnKTtcbiAgfSBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NhYmxlXSB3aWxsIHJlc3BvbmQgdG8gY2xvc2UuemYudHJpZ2dlciBldmVudHMuXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgbGV0IGFuaW1hdGlvbiA9ICQodGhpcykuZGF0YSgnY2xvc2FibGUnKTtcblxuICBpZihhbmltYXRpb24gIT09ICcnKXtcbiAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KCQodGhpcyksIGFuaW1hdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgfVxufSk7XG5cbiQoZG9jdW1lbnQpLm9uKCdmb2N1cy56Zi50cmlnZ2VyIGJsdXIuemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGUtZm9jdXNdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlLWZvY3VzJyk7XG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XG59KTtcblxuLyoqXG4qIEZpcmVzIG9uY2UgYWZ0ZXIgYWxsIG90aGVyIHNjcmlwdHMgaGF2ZSBsb2FkZWRcbiogQGZ1bmN0aW9uXG4qIEBwcml2YXRlXG4qL1xuJCh3aW5kb3cpLm9uKCdsb2FkJywgKCkgPT4ge1xuICBjaGVja0xpc3RlbmVycygpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xuICBldmVudHNMaXN0ZW5lcigpO1xuICByZXNpemVMaXN0ZW5lcigpO1xuICBzY3JvbGxMaXN0ZW5lcigpO1xuICBtdXRhdGVMaXN0ZW5lcigpO1xuICBjbG9zZW1lTGlzdGVuZXIoKTtcbn1cblxuLy8qKioqKioqKiBvbmx5IGZpcmVzIHRoaXMgZnVuY3Rpb24gb25jZSBvbiBsb2FkLCBpZiB0aGVyZSdzIHNvbWV0aGluZyB0byB3YXRjaCAqKioqKioqKlxuZnVuY3Rpb24gY2xvc2VtZUxpc3RlbmVyKHBsdWdpbk5hbWUpIHtcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxuICAgICAgcGx1Z05hbWVzID0gWydkcm9wZG93bicsICd0b29sdGlwJywgJ3JldmVhbCddO1xuXG4gIGlmKHBsdWdpbk5hbWUpe1xuICAgIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMucHVzaChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5jb25jYXQocGx1Z2luTmFtZSk7XG4gICAgfWVsc2V7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICB9XG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xuICAgIGxldCBsaXN0ZW5lcnMgPSBwbHVnTmFtZXMubWFwKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gYGNsb3NlbWUuemYuJHtuYW1lfWA7XG4gICAgfSkuam9pbignICcpO1xuXG4gICAgJCh3aW5kb3cpLm9mZihsaXN0ZW5lcnMpLm9uKGxpc3RlbmVycywgZnVuY3Rpb24oZSwgcGx1Z2luSWQpe1xuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XG4gICAgICBsZXQgcGx1Z2lucyA9ICQoYFtkYXRhLSR7cGx1Z2lufV1gKS5ub3QoYFtkYXRhLXlldGktYm94PVwiJHtwbHVnaW5JZH1cIl1gKTtcblxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCBfdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtcmVzaXplXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuemYudHJpZ2dlcicpXG4gICAgLm9uKCdyZXNpemUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwicmVzaXplXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgcmVzaXplIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZih0aW1lcil7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBzY3JvbGwgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJzY3JvbGxcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtdXRhdGVMaXN0ZW5lcihkZWJvdW5jZSkge1xuICAgIGxldCAkbm9kZXMgPSAkKCdbZGF0YS1tdXRhdGVdJyk7XG4gICAgaWYgKCRub2Rlcy5sZW5ndGggJiYgTXV0YXRpb25PYnNlcnZlcil7XG5cdFx0XHQvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRlIGV2ZW50XG4gICAgICAvL25vIElFIDkgb3IgMTBcblx0XHRcdCRub2Rlcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdCAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuXHRcdFx0fSk7XG4gICAgfVxuIH1cblxuZnVuY3Rpb24gZXZlbnRzTGlzdGVuZXIoKSB7XG4gIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJlc2l6ZV0sIFtkYXRhLXNjcm9sbF0sIFtkYXRhLW11dGF0ZV0nKTtcblxuICAvL2VsZW1lbnQgY2FsbGJhY2tcbiAgdmFyIGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24gPSBmdW5jdGlvbiAobXV0YXRpb25SZWNvcmRzTGlzdCkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0udGFyZ2V0KTtcblxuXHQgIC8vdHJpZ2dlciB0aGUgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGVsZW1lbnQgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICAgIHN3aXRjaCAobXV0YXRpb25SZWNvcmRzTGlzdFswXS50eXBlKSB7XG5cbiAgICAgICAgY2FzZSBcImF0dHJpYnV0ZXNcIjpcbiAgICAgICAgICBpZiAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikgPT09IFwic2Nyb2xsXCIgJiYgbXV0YXRpb25SZWNvcmRzTGlzdFswXS5hdHRyaWJ1dGVOYW1lID09PSBcImRhdGEtZXZlbnRzXCIpIHtcblx0XHQgIFx0JHRhcmdldC50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LCB3aW5kb3cucGFnZVlPZmZzZXRdKTtcblx0XHQgIH1cblx0XHQgIGlmICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSA9PT0gXCJyZXNpemVcIiAmJiBtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwiZGF0YS1ldmVudHNcIikge1xuXHRcdCAgXHQkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXRdKTtcblx0XHQgICB9XG5cdFx0ICBpZiAobXV0YXRpb25SZWNvcmRzTGlzdFswXS5hdHRyaWJ1dGVOYW1lID09PSBcInN0eWxlXCIpIHtcblx0XHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS5hdHRyKFwiZGF0YS1ldmVudHNcIixcIm11dGF0ZVwiKTtcblx0XHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpXSk7XG5cdFx0ICB9XG5cdFx0ICBicmVhaztcblxuICAgICAgICBjYXNlIFwiY2hpbGRMaXN0XCI6XG5cdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLmF0dHIoXCJkYXRhLWV2ZW50c1wiLFwibXV0YXRlXCIpO1xuXHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpXSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vbm90aGluZ1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAobm9kZXMubGVuZ3RoKSB7XG4gICAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIG9yIG11dGF0aW9uIGFkZCBhIHNpbmdsZSBvYnNlcnZlclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbm9kZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtZW50T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uKTtcbiAgICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTogdHJ1ZSwgYXR0cmlidXRlRmlsdGVyOiBbXCJkYXRhLWV2ZW50c1wiLCBcInN0eWxlXCJdIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gW1BIXVxuLy8gRm91bmRhdGlvbi5DaGVja1dhdGNoZXJzID0gY2hlY2tXYXRjaGVycztcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcbi8vIEZvdW5kYXRpb24uSVNlZVlvdSA9IHNjcm9sbExpc3RlbmVyO1xuLy8gRm91bmRhdGlvbi5JRmVlbFlvdSA9IGNsb3NlbWVMaXN0ZW5lcjtcblxufShqUXVlcnkpO1xuXG4vLyBmdW5jdGlvbiBkb21NdXRhdGlvbk9ic2VydmVyKGRlYm91bmNlKSB7XG4vLyAgIC8vICEhISBUaGlzIGlzIGNvbWluZyBzb29uIGFuZCBuZWVkcyBtb3JlIHdvcms7IG5vdCBhY3RpdmUgICEhISAvL1xuLy8gICB2YXIgdGltZXIsXG4vLyAgIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbXV0YXRlXScpO1xuLy8gICAvL1xuLy8gICBpZiAobm9kZXMubGVuZ3RoKSB7XG4vLyAgICAgLy8gdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuLy8gICAgIC8vICAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4vLyAgICAgLy8gICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuLy8gICAgIC8vICAgICBpZiAocHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlcicgaW4gd2luZG93KSB7XG4vLyAgICAgLy8gICAgICAgcmV0dXJuIHdpbmRvd1twcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJ107XG4vLyAgICAgLy8gICAgIH1cbi8vICAgICAvLyAgIH1cbi8vICAgICAvLyAgIHJldHVybiBmYWxzZTtcbi8vICAgICAvLyB9KCkpO1xuLy9cbi8vXG4vLyAgICAgLy9mb3IgdGhlIGJvZHksIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBhbGwgY2hhbmdlcyBlZmZlY3RpbmcgdGhlIHN0eWxlIGFuZCBjbGFzcyBhdHRyaWJ1dGVzXG4vLyAgICAgdmFyIGJvZHlPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGJvZHlNdXRhdGlvbik7XG4vLyAgICAgYm9keU9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOnRydWUsIGF0dHJpYnV0ZUZpbHRlcjpbXCJzdHlsZVwiLCBcImNsYXNzXCJdfSk7XG4vL1xuLy9cbi8vICAgICAvL2JvZHkgY2FsbGJhY2tcbi8vICAgICBmdW5jdGlvbiBib2R5TXV0YXRpb24obXV0YXRlKSB7XG4vLyAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRpb24gZXZlbnRcbi8vICAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG4vL1xuLy8gICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICBib2R5T2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuLy8gICAgICAgICAkKCdbZGF0YS1tdXRhdGVdJykuYXR0cignZGF0YS1ldmVudHMnLFwibXV0YXRlXCIpO1xuLy8gICAgICAgfSwgZGVib3VuY2UgfHwgMTUwKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBYmlkZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWJpZGVcbiAqL1xuXG5jbGFzcyBBYmlkZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEFiaWRlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFiaWRlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBBYmlkZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWJpZGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgQWJpZGUgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IEFiaWRlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRpbnB1dHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0Jyk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEFiaWRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLmFiaWRlJylcbiAgICAgIC5vbigncmVzZXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVzZXRGb3JtKCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdzdWJtaXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlRm9ybSgpO1xuICAgICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnZhbGlkYXRlT24gPT09ICdmaWVsZENoYW5nZScpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdjaGFuZ2UuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2NoYW5nZS56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5saXZlVmFsaWRhdGUpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdpbnB1dC56Zi5hYmlkZScpXG4gICAgICAgIC5vbignaW5wdXQuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMudmFsaWRhdGVPbkJsdXIpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdibHVyLnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdibHVyLnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgQWJpZGUgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciBvciBub3QgYSBmb3JtIGVsZW1lbnQgaGFzIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYW5kIGlmIGl0J3MgY2hlY2tlZCBvciBub3RcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgcmVxdWlyZWRDaGVjaygkZWwpIHtcbiAgICBpZiAoISRlbC5hdHRyKCdyZXF1aXJlZCcpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHZhciBpc0dvb2QgPSB0cnVlO1xuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBpc0dvb2QgPSAkZWxbMF0uY2hlY2tlZDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhciBvcHQgPSAkZWwuZmluZCgnb3B0aW9uOnNlbGVjdGVkJyk7XG4gICAgICAgIGlmICghb3B0Lmxlbmd0aCB8fCAhb3B0LnZhbCgpKSBpc0dvb2QgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmKCEkZWwudmFsKCkgfHwgISRlbC52YWwoKS5sZW5ndGgpIGlzR29vZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBpc0dvb2Q7XG4gIH1cblxuICAvKipcbiAgICogQmFzZWQgb24gJGVsLCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aCBzZWxlY3RvciBpbiB0aGlzIG9yZGVyOlxuICAgKiAxLiBUaGUgZWxlbWVudCdzIGRpcmVjdCBzaWJsaW5nKCdzKS5cbiAgICogMy4gVGhlIGVsZW1lbnQncyBwYXJlbnQncyBjaGlsZHJlbi5cbiAgICpcbiAgICogVGhpcyBhbGxvd3MgZm9yIG11bHRpcGxlIGZvcm0gZXJyb3JzIHBlciBpbnB1dCwgdGhvdWdoIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBmb3JtIGVycm9ycyB3aWxsIGJlIHNob3duLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgcmVmZXJlbmNlIHRvIGZpbmQgdGhlIGZvcm0gZXJyb3Igc2VsZWN0b3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBvYmplY3Qgd2l0aCB0aGUgc2VsZWN0b3IuXG4gICAqL1xuICBmaW5kRm9ybUVycm9yKCRlbCkge1xuICAgIHZhciAkZXJyb3IgPSAkZWwuc2libGluZ3ModGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcblxuICAgIGlmICghJGVycm9yLmxlbmd0aCkge1xuICAgICAgJGVycm9yID0gJGVsLnBhcmVudCgpLmZpbmQodGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGVycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGlzIG9yZGVyOlxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcbiAgICogMy4gVGhlIGAuY2xvc2VzdCgpYCA8bGFiZWw+XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgZmluZExhYmVsKCRlbCkge1xuICAgIHZhciBpZCA9ICRlbFswXS5pZDtcbiAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJGVsLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICRsYWJlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNldCBvZiBsYWJlbHMgYXNzb2NpYXRlZCB3aXRoIGEgc2V0IG9mIHJhZGlvIGVscyBpbiB0aGlzIG9yZGVyXG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kUmFkaW9MYWJlbHMoJGVscykge1xuICAgIHZhciBsYWJlbHMgPSAkZWxzLm1hcCgoaSwgZWwpID0+IHtcbiAgICAgIHZhciBpZCA9IGVsLmlkO1xuICAgICAgdmFyICRsYWJlbCA9IHRoaXMuJGVsZW1lbnQuZmluZChgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcblxuICAgICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAgICRsYWJlbCA9ICQoZWwpLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGxhYmVsWzBdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuICQobGFiZWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyB0byB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSBjbGFzcyB0b1xuICAgKi9cbiAgYWRkRXJyb3JDbGFzc2VzKCRlbCkge1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5hdHRyKCdkYXRhLWludmFsaWQnLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIENTUyBlcnJvciBjbGFzc2VzIGV0YyBmcm9tIGFuIGVudGlyZSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqXG4gICAqL1xuXG4gIHJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKGdyb3VwTmFtZSkge1xuICAgIHZhciAkZWxzID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciAkbGFiZWxzID0gdGhpcy5maW5kUmFkaW9MYWJlbHMoJGVscyk7XG4gICAgdmFyICRmb3JtRXJyb3JzID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbHMpO1xuXG4gICAgaWYgKCRsYWJlbHMubGVuZ3RoKSB7XG4gICAgICAkbGFiZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9ycy5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3JzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgZnJvbSB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tXG4gICAqL1xuICByZW1vdmVFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgLy8gcmFkaW9zIG5lZWQgdG8gY2xlYXIgYWxsIG9mIHRoZSBlbHNcbiAgICBpZigkZWxbMF0udHlwZSA9PSAncmFkaW8nKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcygkZWwuYXR0cignbmFtZScpKTtcbiAgICB9XG5cbiAgICB2YXIgJGxhYmVsID0gdGhpcy5maW5kTGFiZWwoJGVsKTtcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xuXG4gICAgaWYgKCRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICRsYWJlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3IucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSB0byBmaW5kIGlucHV0cyBhbmQgcHJvY2VlZHMgdG8gdmFsaWRhdGUgdGhlbSBpbiB3YXlzIHNwZWNpZmljIHRvIHRoZWlyIHR5cGUuIFxuICAgKiBJZ25vcmVzIGlucHV0cyB3aXRoIGRhdGEtYWJpZGUtaWdub3JlLCB0eXBlPVwiaGlkZGVuXCIgb3IgZGlzYWJsZWQgYXR0cmlidXRlcyBzZXRcbiAgICogQGZpcmVzIEFiaWRlI2ludmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI3ZhbGlkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGFuIEhUTUwgaW5wdXRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGdvb2RUb0dvIC0gSWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC5cbiAgICovXG4gIHZhbGlkYXRlSW5wdXQoJGVsKSB7XG4gICAgdmFyIGNsZWFyUmVxdWlyZSA9IHRoaXMucmVxdWlyZWRDaGVjaygkZWwpLFxuICAgICAgICB2YWxpZGF0ZWQgPSBmYWxzZSxcbiAgICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdHJ1ZSxcbiAgICAgICAgdmFsaWRhdG9yID0gJGVsLmF0dHIoJ2RhdGEtdmFsaWRhdG9yJyksXG4gICAgICAgIGVxdWFsVG8gPSB0cnVlO1xuXG4gICAgLy8gZG9uJ3QgdmFsaWRhdGUgaWdub3JlZCBpbnB1dHMgb3IgaGlkZGVuIGlucHV0cyBvciBkaXNhYmxlZCBpbnB1dHNcbiAgICBpZiAoJGVsLmlzKCdbZGF0YS1hYmlkZS1pZ25vcmVdJykgfHwgJGVsLmlzKCdbdHlwZT1cImhpZGRlblwiXScpIHx8ICRlbC5pcygnW2Rpc2FibGVkXScpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKCRlbFswXS50eXBlKSB7XG4gICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgIHZhbGlkYXRlZCA9IHRoaXMudmFsaWRhdGVSYWRpbygkZWwuYXR0cignbmFtZScpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1vbmUnOlxuICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgdmFsaWRhdGVkID0gY2xlYXJSZXF1aXJlO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFsaWRhdGVkID0gdGhpcy52YWxpZGF0ZVRleHQoJGVsKTtcbiAgICB9XG5cbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICBjdXN0b21WYWxpZGF0b3IgPSB0aGlzLm1hdGNoVmFsaWRhdGlvbigkZWwsIHZhbGlkYXRvciwgJGVsLmF0dHIoJ3JlcXVpcmVkJykpO1xuICAgIH1cblxuICAgIGlmICgkZWwuYXR0cignZGF0YS1lcXVhbHRvJykpIHtcbiAgICAgIGVxdWFsVG8gPSB0aGlzLm9wdGlvbnMudmFsaWRhdG9ycy5lcXVhbFRvKCRlbCk7XG4gICAgfVxuXG5cbiAgICB2YXIgZ29vZFRvR28gPSBbY2xlYXJSZXF1aXJlLCB2YWxpZGF0ZWQsIGN1c3RvbVZhbGlkYXRvciwgZXF1YWxUb10uaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICAgIHZhciBtZXNzYWdlID0gKGdvb2RUb0dvID8gJ3ZhbGlkJyA6ICdpbnZhbGlkJykgKyAnLnpmLmFiaWRlJztcblxuICAgIGlmIChnb29kVG9Hbykge1xuICAgICAgLy8gUmUtdmFsaWRhdGUgaW5wdXRzIHRoYXQgZGVwZW5kIG9uIHRoaXMgb25lIHdpdGggZXF1YWx0b1xuICAgICAgY29uc3QgZGVwZW5kZW50RWxlbWVudHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsdG89XCIkeyRlbC5hdHRyKCdpZCcpfVwiXWApO1xuICAgICAgaWYgKGRlcGVuZGVudEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBsZXQgX3RoaXMgPSB0aGlzO1xuICAgICAgICBkZXBlbmRlbnRFbGVtZW50cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkKHRoaXMpLnZhbCgpKSB7XG4gICAgICAgICAgICBfdGhpcy52YWxpZGF0ZUlucHV0KCQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpc1tnb29kVG9HbyA/ICdyZW1vdmVFcnJvckNsYXNzZXMnIDogJ2FkZEVycm9yQ2xhc3NlcyddKCRlbCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBpbnB1dCBpcyBkb25lIGNoZWNraW5nIGZvciB2YWxpZGF0aW9uLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgdmFsaWQuemYuYWJpZGVgIG9yIGBpbnZhbGlkLnpmLmFiaWRlYFxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIERPTSBlbGVtZW50IG9mIHRoZSBpbnB1dC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjdmFsaWRcbiAgICAgKiBAZXZlbnQgQWJpZGUjaW52YWxpZFxuICAgICAqL1xuICAgICRlbC50cmlnZ2VyKG1lc3NhZ2UsIFskZWxdKTtcblxuICAgIHJldHVybiBnb29kVG9HbztcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIGFuZCBpZiB0aGVyZSBhcmUgYW55IGludmFsaWQgaW5wdXRzLCBpdCB3aWxsIGRpc3BsYXkgdGhlIGZvcm0gZXJyb3IgZWxlbWVudFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gbm9FcnJvciAtIHRydWUgaWYgbm8gZXJyb3JzIHdlcmUgZGV0ZWN0ZWQuLi5cbiAgICogQGZpcmVzIEFiaWRlI2Zvcm12YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybWludmFsaWRcbiAgICovXG4gIHZhbGlkYXRlRm9ybSgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGlucHV0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgYWNjLnB1c2goX3RoaXMudmFsaWRhdGVJbnB1dCgkKHRoaXMpKSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbm9FcnJvciA9IGFjYy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpLmNzcygnZGlzcGxheScsIChub0Vycm9yID8gJ25vbmUnIDogJ2Jsb2NrJykpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBpcyBmaW5pc2hlZCB2YWxpZGF0aW5nLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgZm9ybXZhbGlkLnpmLmFiaWRlYCBvciBgZm9ybWludmFsaWQuemYuYWJpZGVgLlxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIGVsZW1lbnQgb2YgdGhlIGZvcm0uXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm12YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtaW52YWxpZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigobm9FcnJvciA/ICdmb3JtdmFsaWQnIDogJ2Zvcm1pbnZhbGlkJykgKyAnLnpmLmFiaWRlJywgW3RoaXMuJGVsZW1lbnRdKTtcblxuICAgIHJldHVybiBub0Vycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBhIG5vdCBhIHRleHQgaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gdGhlIHBhdHRlcm4gc3BlY2lmaWVkIGluIHRoZSBhdHRyaWJ1dGUuIElmIG5vIG1hdGNoaW5nIHBhdHRlcm4gaXMgZm91bmQsIHJldHVybnMgdHJ1ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gdmFsaWRhdGUsIHNob3VsZCBiZSBhIHRleHQgaW5wdXQgSFRNTCBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXR0ZXJuIC0gc3RyaW5nIHZhbHVlIG9mIG9uZSBvZiB0aGUgUmVnRXggcGF0dGVybnMgaW4gQWJpZGUub3B0aW9ucy5wYXR0ZXJuc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IHRoZSBpbnB1dCB2YWx1ZSBtYXRjaGVzIHRoZSBwYXR0ZXJuIHNwZWNpZmllZFxuICAgKi9cbiAgdmFsaWRhdGVUZXh0KCRlbCwgcGF0dGVybikge1xuICAgIC8vIEEgcGF0dGVybiBjYW4gYmUgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIG9yIGl0IHdpbGwgYmUgaW5mZXJlZCBmcm9tIHRoZSBpbnB1dCdzIFwicGF0dGVyblwiIGF0dHJpYnV0ZSwgb3IgaXQncyBcInR5cGVcIiBhdHRyaWJ1dGVcbiAgICBwYXR0ZXJuID0gKHBhdHRlcm4gfHwgJGVsLmF0dHIoJ3BhdHRlcm4nKSB8fCAkZWwuYXR0cigndHlwZScpKTtcbiAgICB2YXIgaW5wdXRUZXh0ID0gJGVsLnZhbCgpO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlO1xuXG4gICAgaWYgKGlucHV0VGV4dC5sZW5ndGgpIHtcbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudCBpcyBpbiBBYmlkZSdzIGxpc3Qgb2YgcGF0dGVybnMsIHRoZW4gdGVzdCB0aGF0IHJlZ2V4cFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5wYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShwYXR0ZXJuKSkge1xuICAgICAgICB2YWxpZCA9IHRoaXMub3B0aW9ucy5wYXR0ZXJuc1twYXR0ZXJuXS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgcGF0dGVybiBuYW1lIGlzbid0IGFsc28gdGhlIHR5cGUgYXR0cmlidXRlIG9mIHRoZSBmaWVsZCwgdGhlbiB0ZXN0IGl0IGFzIGEgcmVnZXhwXG4gICAgICBlbHNlIGlmIChwYXR0ZXJuICE9PSAkZWwuYXR0cigndHlwZScpKSB7XG4gICAgICAgIHZhbGlkID0gbmV3IFJlZ0V4cChwYXR0ZXJuKS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbiBlbXB0eSBmaWVsZCBpcyB2YWxpZCBpZiBpdCdzIG5vdCByZXF1aXJlZFxuICAgIGVsc2UgaWYgKCEkZWwucHJvcCgncmVxdWlyZWQnKSkge1xuICAgICAgdmFsaWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZDtcbiAgIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgcmFkaW8gaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gd2hldGhlciBvciBub3QgaXQgaXMgcmVxdWlyZWQgYW5kIHNlbGVjdGVkLiBBbHRob3VnaCB0aGUgZnVuY3Rpb24gdGFyZ2V0cyBhIHNpbmdsZSBgPGlucHV0PmAsIGl0IHZhbGlkYXRlcyBieSBjaGVja2luZyB0aGUgYHJlcXVpcmVkYCBhbmQgYGNoZWNrZWRgIHByb3BlcnRpZXMgb2YgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gaXRzIGdyb3VwLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdCBsZWFzdCBvbmUgcmFkaW8gaW5wdXQgaGFzIGJlZW4gc2VsZWN0ZWQgKGlmIGl0J3MgcmVxdWlyZWQpXG4gICAqL1xuICB2YWxpZGF0ZVJhZGlvKGdyb3VwTmFtZSkge1xuICAgIC8vIElmIGF0IGxlYXN0IG9uZSByYWRpbyBpbiB0aGUgZ3JvdXAgaGFzIHRoZSBgcmVxdWlyZWRgIGF0dHJpYnV0ZSwgdGhlIGdyb3VwIGlzIGNvbnNpZGVyZWQgcmVxdWlyZWRcbiAgICAvLyBQZXIgVzNDIHNwZWMsIGFsbCByYWRpbyBidXR0b25zIGluIGEgZ3JvdXAgc2hvdWxkIGhhdmUgYHJlcXVpcmVkYCwgYnV0IHdlJ3JlIGJlaW5nIG5pY2VcbiAgICB2YXIgJGdyb3VwID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlLCByZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSByZXF1aXJlZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIHJlcXVpcmVkXG4gICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcbiAgICAgIGlmICgkKGUpLmF0dHIoJ3JlcXVpcmVkJykpIHtcbiAgICAgICAgcmVxdWlyZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmKCFyZXF1aXJlZCkgdmFsaWQ9dHJ1ZTtcblxuICAgIGlmICghdmFsaWQpIHtcbiAgICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgdmFsaWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSBjaGVja2VkXG4gICAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgICBpZiAoJChlKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gdmFsaWQ7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiBhIHNlbGVjdGVkIGlucHV0IHBhc3NlcyBhIGN1c3RvbSB2YWxpZGF0aW9uIGZ1bmN0aW9uLiBNdWx0aXBsZSB2YWxpZGF0aW9ucyBjYW4gYmUgdXNlZCwgaWYgcGFzc2VkIHRvIHRoZSBlbGVtZW50IHdpdGggYGRhdGEtdmFsaWRhdG9yPVwiZm9vIGJhciBiYXpcImAgaW4gYSBzcGFjZSBzZXBhcmF0ZWQgbGlzdGVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IGlucHV0IGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2YWxpZGF0b3JzIC0gYSBzdHJpbmcgb2YgZnVuY3Rpb24gbmFtZXMgbWF0Y2hpbmcgZnVuY3Rpb25zIGluIHRoZSBBYmlkZS5vcHRpb25zLnZhbGlkYXRvcnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIC0gc2VsZiBleHBsYW5hdG9yeT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiB2YWxpZGF0aW9ucyBwYXNzZWQuXG4gICAqL1xuICBtYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3JzLCByZXF1aXJlZCkge1xuICAgIHJlcXVpcmVkID0gcmVxdWlyZWQgPyB0cnVlIDogZmFsc2U7XG5cbiAgICB2YXIgY2xlYXIgPSB2YWxpZGF0b3JzLnNwbGl0KCcgJykubWFwKCh2KSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnNbdl0oJGVsLCByZXF1aXJlZCwgJGVsLnBhcmVudCgpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2xlYXIuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBmb3JtIGlucHV0cyBhbmQgc3R5bGVzXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtcmVzZXRcbiAgICovXG4gIHJlc2V0Rm9ybSgpIHtcbiAgICB2YXIgJGZvcm0gPSB0aGlzLiRlbGVtZW50LFxuICAgICAgICBvcHRzID0gdGhpcy5vcHRpb25zO1xuXG4gICAgJChgLiR7b3B0cy5sYWJlbEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgJChgLiR7b3B0cy5pbnB1dEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmlucHV0RXJyb3JDbGFzcyk7XG4gICAgJChgJHtvcHRzLmZvcm1FcnJvclNlbGVjdG9yfS4ke29wdHMuZm9ybUVycm9yQ2xhc3N9YCkucmVtb3ZlQ2xhc3Mob3B0cy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgJGZvcm0uZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAkKCc6aW5wdXQnLCAkZm9ybSkubm90KCc6YnV0dG9uLCA6c3VibWl0LCA6cmVzZXQsIDpoaWRkZW4sIDpyYWRpbywgOmNoZWNrYm94LCBbZGF0YS1hYmlkZS1pZ25vcmVdJykudmFsKCcnKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAkKCc6aW5wdXQ6cmFkaW8nLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpjaGVja2JveCcsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBoYXMgYmVlbiByZXNldC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXJlc2V0XG4gICAgICovXG4gICAgJGZvcm0udHJpZ2dlcignZm9ybXJlc2V0LnpmLmFiaWRlJywgWyRmb3JtXSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgQWJpZGUuXG4gICAqIFJlbW92ZXMgZXJyb3Igc3R5bGVzIGFuZCBjbGFzc2VzIGZyb20gZWxlbWVudHMsIHdpdGhvdXQgcmVzZXR0aW5nIHRoZWlyIHZhbHVlcy5cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpXG4gICAgICAgIC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXG4gICAgdGhpcy4kaW5wdXRzXG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLnJlbW92ZUVycm9yQ2xhc3NlcygkKHRoaXMpKTtcbiAgICAgIH0pO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkFiaWRlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZXZlbnQgdG8gdmFsaWRhdGUgaW5wdXRzLiBDaGVja2JveGVzIGFuZCByYWRpb3MgdmFsaWRhdGUgaW1tZWRpYXRlbHkuXG4gICAqIFJlbW92ZSBvciBjaGFuZ2UgdGhpcyB2YWx1ZSBmb3IgbWFudWFsIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUgez9zdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdmaWVsZENoYW5nZSdcbiAgICovXG4gIHZhbGlkYXRlT246ICdmaWVsZENoYW5nZScsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXQgbGFiZWxzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdpcy1pbnZhbGlkLWxhYmVsJ1xuICAgKi9cbiAgbGFiZWxFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1sYWJlbCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHRvIGJlIGFwcGxpZWQgdG8gaW5wdXRzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdpcy1pbnZhbGlkLWlucHV0J1xuICAgKi9cbiAgaW5wdXRFcnJvckNsYXNzOiAnaXMtaW52YWxpZC1pbnB1dCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIHNlbGVjdG9yIHRvIHVzZSB0byB0YXJnZXQgRm9ybSBFcnJvcnMgZm9yIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnLmZvcm0tZXJyb3InXG4gICAqL1xuICBmb3JtRXJyb3JTZWxlY3RvcjogJy5mb3JtLWVycm9yJyxcblxuICAvKipcbiAgICogQ2xhc3MgYWRkZWQgdG8gRm9ybSBFcnJvcnMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2lzLXZpc2libGUnXG4gICAqL1xuICBmb3JtRXJyb3JDbGFzczogJ2lzLXZpc2libGUnLFxuXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSB0byB2YWxpZGF0ZSB0ZXh0IGlucHV0cyBvbiBhbnkgdmFsdWUgY2hhbmdlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgbGl2ZVZhbGlkYXRlOiBmYWxzZSxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgdG8gdmFsaWRhdGUgaW5wdXRzIG9uIGJsdXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICB2YWxpZGF0ZU9uQmx1cjogZmFsc2UsXG5cbiAgcGF0dGVybnM6IHtcbiAgICBhbHBoYSA6IC9eW2EtekEtWl0rJC8sXG4gICAgYWxwaGFfbnVtZXJpYyA6IC9eW2EtekEtWjAtOV0rJC8sXG4gICAgaW50ZWdlciA6IC9eWy0rXT9cXGQrJC8sXG4gICAgbnVtYmVyIDogL15bLStdP1xcZCooPzpbXFwuXFwsXVxcZCspPyQvLFxuXG4gICAgLy8gYW1leCwgdmlzYSwgZGluZXJzXG4gICAgY2FyZCA6IC9eKD86NFswLTldezEyfSg/OlswLTldezN9KT98NVsxLTVdWzAtOV17MTR9fDYoPzowMTF8NVswLTldWzAtOV0pWzAtOV17MTJ9fDNbNDddWzAtOV17MTN9fDMoPzowWzAtNV18WzY4XVswLTldKVswLTldezExfXwoPzoyMTMxfDE4MDB8MzVcXGR7M30pXFxkezExfSkkLyxcbiAgICBjdnYgOiAvXihbMC05XSl7Myw0fSQvLFxuXG4gICAgLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2Uvc3RhdGVzLW9mLXRoZS10eXBlLWF0dHJpYnV0ZS5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzXG4gICAgZW1haWwgOiAvXlthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSskLyxcblxuICAgIHVybCA6IC9eKGh0dHBzP3xmdHB8ZmlsZXxzc2gpOlxcL1xcLygoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKChcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSkpfCgoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4pKygoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLj8pKDpcXGQqKT8pKFxcLygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KT8oXFw/KCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxbXFx1RTAwMC1cXHVGOEZGXXxcXC98XFw/KSopPyhcXCMoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFxcL3xcXD8pKik/JC8sXG4gICAgLy8gYWJjLmRlXG4gICAgZG9tYWluIDogL14oW2EtekEtWjAtOV0oW2EtekEtWjAtOVxcLV17MCw2MX1bYS16QS1aMC05XSk/XFwuKStbYS16QS1aXXsyLDh9JC8sXG5cbiAgICBkYXRldGltZSA6IC9eKFswLTJdWzAtOV17M30pXFwtKFswLTFdWzAtOV0pXFwtKFswLTNdWzAtOV0pVChbMC01XVswLTldKVxcOihbMC01XVswLTldKVxcOihbMC01XVswLTldKShafChbXFwtXFwrXShbMC0xXVswLTldKVxcOjAwKSkkLyxcbiAgICAvLyBZWVlZLU1NLUREXG4gICAgZGF0ZSA6IC8oPzoxOXwyMClbMC05XXsyfS0oPzooPzowWzEtOV18MVswLTJdKS0oPzowWzEtOV18MVswLTldfDJbMC05XSl8KD86KD8hMDIpKD86MFsxLTldfDFbMC0yXSktKD86MzApKXwoPzooPzowWzEzNTc4XXwxWzAyXSktMzEpKSQvLFxuICAgIC8vIEhIOk1NOlNTXG4gICAgdGltZSA6IC9eKDBbMC05XXwxWzAtOV18MlswLTNdKSg6WzAtNV1bMC05XSl7Mn0kLyxcbiAgICBkYXRlSVNPIDogL15cXGR7NH1bXFwvXFwtXVxcZHsxLDJ9W1xcL1xcLV1cXGR7MSwyfSQvLFxuICAgIC8vIE1NL0REL1lZWVlcbiAgICBtb250aF9kYXlfeWVhciA6IC9eKDBbMS05XXwxWzAxMl0pWy0gXFwvLl0oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXVxcZHs0fSQvLFxuICAgIC8vIEREL01NL1lZWVlcbiAgICBkYXlfbW9udGhfeWVhciA6IC9eKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl0oMFsxLTldfDFbMDEyXSlbLSBcXC8uXVxcZHs0fSQvLFxuXG4gICAgLy8gI0ZGRiBvciAjRkZGRkZGXG4gICAgY29sb3IgOiAvXiM/KFthLWZBLUYwLTldezZ9fFthLWZBLUYwLTldezN9KSQvXG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHZhbGlkYXRpb24gZnVuY3Rpb25zIHRvIGJlIHVzZWQuIGBlcXVhbFRvYCBiZWluZyB0aGUgb25seSBkZWZhdWx0IGluY2x1ZGVkIGZ1bmN0aW9uLlxuICAgKiBGdW5jdGlvbnMgc2hvdWxkIHJldHVybiBvbmx5IGEgYm9vbGVhbiBpZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LiBGdW5jdGlvbnMgYXJlIGdpdmVuIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxuICAgKiBlbCA6IFRoZSBqUXVlcnkgZWxlbWVudCB0byB2YWxpZGF0ZS5cbiAgICogcmVxdWlyZWQgOiBCb29sZWFuIHZhbHVlIG9mIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYmUgcHJlc2VudCBvciBub3QuXG4gICAqIHBhcmVudCA6IFRoZSBkaXJlY3QgcGFyZW50IG9mIHRoZSBpbnB1dC5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgdmFsaWRhdG9yczoge1xuICAgIGVxdWFsVG86IGZ1bmN0aW9uIChlbCwgcmVxdWlyZWQsIHBhcmVudCkge1xuICAgICAgcmV0dXJuICQoYCMke2VsLmF0dHIoJ2RhdGEtZXF1YWx0bycpfWApLnZhbCgpID09PSBlbC52YWwoKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFiaWRlLCAnQWJpZGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICovXG5cbmNsYXNzIEFjY29yZGlvbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbi5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBhIHBsYWluIG9iamVjdCB3aXRoIHNldHRpbmdzIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEFjY29yZGlvbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uJywge1xuICAgICAgJ0VOVEVSJzogJ3RvZ2dsZScsXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBhY2NvcmRpb24gYnkgYW5pbWF0aW5nIHRoZSBwcmVzZXQgYWN0aXZlIHBhbmUocykuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3JvbGUnLCAndGFibGlzdCcpO1xuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1hY2NvcmRpb24taXRlbV0nKTtcblxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbihpZHgsIGVsKSB7XG4gICAgICB2YXIgJGVsID0gJChlbCksXG4gICAgICAgICAgJGNvbnRlbnQgPSAkZWwuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpLFxuICAgICAgICAgIGlkID0gJGNvbnRlbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjb3JkaW9uJyksXG4gICAgICAgICAgbGlua0lkID0gZWwuaWQgfHwgYCR7aWR9LWxhYmVsYDtcblxuICAgICAgJGVsLmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKHtcbiAgICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICAgJ3JvbGUnOiAndGFiJyxcbiAgICAgICAgJ2lkJzogbGlua0lkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXG4gICAgICB9KTtcblxuICAgICAgJGNvbnRlbnQuYXR0cih7J3JvbGUnOiAndGFicGFuZWwnLCAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLCAnYXJpYS1oaWRkZW4nOiB0cnVlLCAnaWQnOiBpZH0pO1xuICAgIH0pO1xuICAgIHZhciAkaW5pdEFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICBpZigkaW5pdEFjdGl2ZS5sZW5ndGgpe1xuICAgICAgdGhpcy5kb3duKCRpbml0QWN0aXZlLCB0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBhY2NvcmRpb24uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpO1xuICAgICAgdmFyICR0YWJDb250ZW50ID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCR0YWJDb250ZW50Lmxlbmd0aCkge1xuICAgICAgICAkZWxlbS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uIGtleWRvd24uemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgIC5vbignY2xpY2suemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy50b2dnbGUoJHRhYkNvbnRlbnQpO1xuICAgICAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnQWNjb3JkaW9uJywge1xuICAgICAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMudG9nZ2xlKCR0YWJDb250ZW50KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ubmV4dCgpLmZpbmQoJ2EnKS5mb2N1cygpO1xuICAgICAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQpIHtcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5wcmV2KCkuZmluZCgnYScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xuICAgICAgICAgICAgICAgICRhLnRyaWdnZXIoJ2NsaWNrLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBzZWxlY3RlZCBjb250ZW50IHBhbmUncyBvcGVuL2Nsb3NlIHN0YXRlLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIGpRdWVyeSBvYmplY3Qgb2YgdGhlIHBhbmUgdG8gdG9nZ2xlIChgLmFjY29yZGlvbi1jb250ZW50YCkuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCR0YXJnZXQpIHtcbiAgICBpZigkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgdGhpcy51cCgkdGFyZ2V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgYWNjb3JkaW9uIHRhYiBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gcGFuZSB0byBvcGVuIChgLmFjY29yZGlvbi1jb250ZW50YCkuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gZmlyc3RUaW1lIC0gZmxhZyB0byBkZXRlcm1pbmUgaWYgcmVmbG93IHNob3VsZCBoYXBwZW4uXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jZG93blxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRvd24oJHRhcmdldCwgZmlyc3RUaW1lKSB7XG4gICAgJHRhcmdldFxuICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpXG4gICAgICAucGFyZW50KCdbZGF0YS10YWItY29udGVudF0nKVxuICAgICAgLmFkZEJhY2soKVxuICAgICAgLnBhcmVudCgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kICYmICFmaXJzdFRpbWUpIHtcbiAgICAgIHZhciAkY3VycmVudEFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJy5pcy1hY3RpdmUnKS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgICBpZiAoJGN1cnJlbnRBY3RpdmUubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMudXAoJGN1cnJlbnRBY3RpdmUubm90KCR0YXJnZXQpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkdGFyZ2V0LnNsaWRlRG93bih0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgKCkgPT4ge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSB0YWIgaXMgZG9uZSBvcGVuaW5nLlxuICAgICAgICogQGV2ZW50IEFjY29yZGlvbiNkb3duXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignZG93bi56Zi5hY2NvcmRpb24nLCBbJHRhcmdldF0pO1xuICAgIH0pO1xuXG4gICAgJChgIyR7JHRhcmdldC5hdHRyKCdhcmlhLWxhYmVsbGVkYnknKX1gKS5hdHRyKHtcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogdHJ1ZSxcbiAgICAgICdhcmlhLXNlbGVjdGVkJzogdHJ1ZVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgdGFiIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIEFjY29yZGlvbiB0YWIgdG8gY2xvc2UgKGAuYWNjb3JkaW9uLWNvbnRlbnRgKS5cbiAgICogQGZpcmVzIEFjY29yZGlvbiN1cFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHVwKCR0YXJnZXQpIHtcbiAgICB2YXIgJGF1bnRzID0gJHRhcmdldC5wYXJlbnQoKS5zaWJsaW5ncygpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZigoIXRoaXMub3B0aW9ucy5hbGxvd0FsbENsb3NlZCAmJiAhJGF1bnRzLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkgfHwgISR0YXJnZXQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpe1xuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgY29sbGFwc2luZyB1cC5cbiAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbiN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcbiAgICAgIH0pO1xuICAgIC8vIH0pO1xuXG4gICAgJHRhcmdldC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpXG4gICAgICAgICAgIC5wYXJlbnQoKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAkKGAjJHskdGFyZ2V0LmF0dHIoJ2FyaWEtbGFiZWxsZWRieScpfWApLmF0dHIoe1xuICAgICAnYXJpYS1leHBhbmRlZCc6IGZhbHNlLFxuICAgICAnYXJpYS1zZWxlY3RlZCc6IGZhbHNlXG4gICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24uXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jZGVzdHJveWVkXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXRhYi1jb250ZW50XScpLnN0b3AodHJ1ZSkuc2xpZGVVcCgwKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdhJykub2ZmKCcuemYuYWNjb3JkaW9uJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhbiBhY2NvcmRpb24gcGFuZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAyNTBcbiAgICovXG4gIHNsaWRlU3BlZWQ6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgbXVsdGlFeHBhbmQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBjbG9zZSBhbGwgcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhbGxvd0FsbENsb3NlZDogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb24sICdBY2NvcmRpb24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBBY2NvcmRpb25NZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uTWVudS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAnY2xvc2UnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZUFsbCdcbiAgICB9KTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBtZW51IGJ5IGhpZGluZyBhbGwgbmVzdGVkIG1lbnVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLm5vdCgnLmlzLWFjdGl2ZScpLnNsaWRlVXAoMCk7Ly8uZmluZCgnYScpLmNzcygncGFkZGluZy1sZWZ0JywgJzFyZW0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3JvbGUnOiAnbWVudScsXG4gICAgICAnYXJpYS1tdWx0aXNlbGVjdGFibGUnOiB0aGlzLm9wdGlvbnMubXVsdGlPcGVuXG4gICAgfSk7XG5cbiAgICB0aGlzLiRtZW51TGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRtZW51TGlua3MuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIGxpbmtJZCA9IHRoaXMuaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUtbGluaycpLFxuICAgICAgICAgICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyksXG4gICAgICAgICAgc3ViSWQgPSAkc3ViWzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjYy1tZW51JyksXG4gICAgICAgICAgaXNBY3RpdmUgPSAkc3ViLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRlbGVtLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IHN1YklkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICdtZW51aXRlbScsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG4gICAgICAkc3ViLmF0dHIoe1xuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiAhaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ21lbnUnLFxuICAgICAgICAnaWQnOiBzdWJJZFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIGluaXRQYW5lcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpO1xuICAgIGlmKGluaXRQYW5lcy5sZW5ndGgpe1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgIGluaXRQYW5lcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIF90aGlzLmRvd24oJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJHN1Ym1lbnUgPSAkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICBpZiAoJHN1Ym1lbnUubGVuZ3RoKSB7XG4gICAgICAgICQodGhpcykuY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKS5vbignY2xpY2suemYuYWNjb3JkaW9uTWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBfdGhpcy50b2dnbGUoJHN1Ym1lbnUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb25tZW51JywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50LFxuICAgICAgICAgICR0YXJnZXQgPSAkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG5cbiAgICAgICAgICBpZiAoJCh0aGlzKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnbGk6Zmlyc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCQodGhpcykuaXMoJzpmaXJzdC1jaGlsZCcpKSB7IC8vIGlzIGZpcnN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRwcmV2RWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdOnZpc2libGUnKS5sZW5ndGgpIHsgLy8gaWYgcHJldmlvdXMgZWxlbWVudCBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJHByZXZFbGVtZW50LnBhcmVudHMoJ2xpJykuZmluZCgnbGk6bGFzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmxhc3QtY2hpbGQnKSkgeyAvLyBpcyBsYXN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5uZXh0KCdsaScpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb25NZW51Jywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgICAgICAgJHRhcmdldC5maW5kKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGggJiYgISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkgeyAvLyBjbG9zZSBhY3RpdmUgc3ViIG9mIHRoaXMgaXRlbVxuICAgICAgICAgICAgX3RoaXMudXAoJHRhcmdldCk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7IC8vIGNsb3NlIGN1cnJlbnRseSBvcGVuIHN1YlxuICAgICAgICAgICAgX3RoaXMudXAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBfdGhpcy50b2dnbGUoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmhpZGVBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7Ly8uYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHBhbmVzIG9mIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGVBbGwoKSB7XG4gICAgdGhpcy51cCh0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGFsbCBwYW5lcyBvZiB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93QWxsKCkge1xuICAgIHRoaXMuZG93bih0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2Ugc3RhdGUgb2YgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSB0aGUgc3VibWVudSB0byB0b2dnbGVcbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KXtcbiAgICBpZighJHRhcmdldC5pcygnOmFuaW1hdGVkJykpIHtcbiAgICAgIGlmICghJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gb3Blbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZG93blxuICAgKi9cbiAgZG93bigkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMubXVsdGlPcGVuKSB7XG4gICAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLm5vdCgkdGFyZ2V0LnBhcmVudHNVbnRpbCh0aGlzLiRlbGVtZW50KS5hZGQoJHRhcmdldCkpKTtcbiAgICB9XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG5cbiAgICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHRhcmdldC5zbGlkZURvd24oX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbk1lbnUjZG93blxuICAgICAgICAgICAqL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICAgIH0pO1xuICAgICAgLy99KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLiBBbGwgc3ViLW1lbnVzIGluc2lkZSB0aGUgdGFyZ2V0IHdpbGwgYmUgY2xvc2VkIGFzIHdlbGwuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gY2xvc2UuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I3VwXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvL30pO1xuXG4gICAgdmFyICRtZW51cyA9ICR0YXJnZXQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKDApLmFkZEJhY2soKS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgJG1lbnVzLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVEb3duKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdhY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYSBzdWJtZW51IGluIG1zLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBtdWx0aU9wZW46IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb25NZW51LCAnQWNjb3JkaW9uTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRHJpbGxkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcmlsbGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcmlsbGRvd24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyaWxsZG93biBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcmlsbGRvd24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5GZWF0aGVyKHRoaXMuJGVsZW1lbnQsICdkcmlsbGRvd24nKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0RyaWxsZG93bicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0RyaWxsZG93bicsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICdBUlJPV19VUCc6ICd1cCcsXG4gICAgICAnQVJST1dfRE9XTic6ICdkb3duJyxcbiAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgICAgJ1RBQic6ICdkb3duJyxcbiAgICAgICdTSElGVF9UQUInOiAndXAnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGRyaWxsZG93biBieSBjcmVhdGluZyBqUXVlcnkgY29sbGVjdGlvbnMgb2YgZWxlbWVudHNcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaS5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignYScpO1xuICAgIHRoaXMuJHN1Ym1lbnVzID0gdGhpcy4kc3VibWVudUFuY2hvcnMucGFyZW50KCdsaScpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuICAgIHRoaXMuJG1lbnVJdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGknKS5ub3QoJy5qcy1kcmlsbGRvd24tYmFjaycpLmF0dHIoJ3JvbGUnLCAnbWVudWl0ZW0nKS5maW5kKCdhJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLW11dGF0ZScsICh0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtZHJpbGxkb3duJykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZHJpbGxkb3duJykpKTtcblxuICAgIHRoaXMuX3ByZXBhcmVNZW51KCk7XG4gICAgdGhpcy5fcmVnaXN0ZXJFdmVudHMoKTtcblxuICAgIHRoaXMuX2tleWJvYXJkRXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogcHJlcGFyZXMgZHJpbGxkb3duIG1lbnUgYnkgc2V0dGluZyBhdHRyaWJ1dGVzIHRvIGxpbmtzIGFuZCBlbGVtZW50c1xuICAgKiBzZXRzIGEgbWluIGhlaWdodCB0byBwcmV2ZW50IGNvbnRlbnQganVtcGluZ1xuICAgKiB3cmFwcyB0aGUgZWxlbWVudCBpZiBub3QgYWxyZWFkeSB3cmFwcGVkXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX3ByZXBhcmVNZW51KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLy8gaWYoIXRoaXMub3B0aW9ucy5ob2xkT3Blbil7XG4gICAgLy8gICB0aGlzLl9tZW51TGlua0V2ZW50cygpO1xuICAgIC8vIH1cbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgdmFyICRzdWIgPSAkbGluay5wYXJlbnQoKTtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMucGFyZW50TGluayl7XG4gICAgICAgICRsaW5rLmNsb25lKCkucHJlcGVuZFRvKCRzdWIuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpLndyYXAoJzxsaSBjbGFzcz1cImlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0gaXMtc3VibWVudS1pdGVtIGlzLWRyaWxsZG93bi1zdWJtZW51LWl0ZW1cIiByb2xlPVwibWVudS1pdGVtXCI+PC9saT4nKTtcbiAgICAgIH1cbiAgICAgICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicsICRsaW5rLmF0dHIoJ2hyZWYnKSkucmVtb3ZlQXR0cignaHJlZicpLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gICAgICAkbGluay5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAwLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoJGxpbmspO1xuICAgIH0pO1xuICAgIHRoaXMuJHN1Ym1lbnVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbWVudSA9ICQodGhpcyksXG4gICAgICAgICAgJGJhY2sgPSAkbWVudS5maW5kKCcuanMtZHJpbGxkb3duLWJhY2snKTtcbiAgICAgIGlmKCEkYmFjay5sZW5ndGgpe1xuICAgICAgICBzd2l0Y2ggKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvblBvc2l0aW9uKSB7XG4gICAgICAgICAgY2FzZSBcImJvdHRvbVwiOlxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwidG9wXCI6XG4gICAgICAgICAgICAkbWVudS5wcmVwZW5kKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlVuc3VwcG9ydGVkIGJhY2tCdXR0b25Qb3NpdGlvbiB2YWx1ZSAnXCIgKyBfdGhpcy5vcHRpb25zLmJhY2tCdXR0b25Qb3NpdGlvbiArIFwiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgX3RoaXMuX2JhY2soJG1lbnUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kc3VibWVudXMuYWRkQ2xhc3MoJ2ludmlzaWJsZScpO1xuICAgIGlmKCF0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkge1xuICAgICAgdGhpcy4kc3VibWVudXMuYWRkQ2xhc3MoJ2RyaWxsZG93bi1zdWJtZW51LWNvdmVyLXByZXZpb3VzJyk7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGEgd3JhcHBlciBvbiBlbGVtZW50IGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgaWYoIXRoaXMuJGVsZW1lbnQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bicpKXtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSAkKHRoaXMub3B0aW9ucy53cmFwcGVyKS5hZGRDbGFzcygnaXMtZHJpbGxkb3duJyk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZUhlaWdodCkgdGhpcy4kd3JhcHBlci5hZGRDbGFzcygnYW5pbWF0ZS1oZWlnaHQnKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQud3JhcCh0aGlzLiR3cmFwcGVyKTtcbiAgICB9XG4gICAgLy8gc2V0IHdyYXBwZXJcbiAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC5wYXJlbnQoKTtcbiAgICB0aGlzLiR3cmFwcGVyLmNzcyh0aGlzLl9nZXRNYXhEaW1zKCkpO1xuICB9XG5cbiAgX3Jlc2l6ZSgpIHtcbiAgICB0aGlzLiR3cmFwcGVyLmNzcyh7J21heC13aWR0aCc6ICdub25lJywgJ21pbi1oZWlnaHQnOiAnbm9uZSd9KTtcbiAgICAvLyBfZ2V0TWF4RGltcyBoYXMgc2lkZSBlZmZlY3RzIChib28pIGJ1dCBjYWxsaW5nIGl0IHNob3VsZCB1cGRhdGUgYWxsIG90aGVyIG5lY2Vzc2FyeSBoZWlnaHRzICYgd2lkdGhzXG4gICAgdGhpcy4kd3JhcHBlci5jc3ModGhpcy5fZ2V0TWF4RGltcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIGVsZW1lbnRzIGluIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgbWVudSBpdGVtIHRvIGFkZCBoYW5kbGVycyB0by5cbiAgICovXG4gIF9ldmVudHMoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZigkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ2xpJykuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZihlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0LmZpcnN0RWxlbWVudENoaWxkKXtcbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgX3RoaXMuX3Nob3coJGVsZW0ucGFyZW50KCdsaScpKTtcblxuICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spe1xuICAgICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cdCAgdGhpcy4kZWxlbWVudC5vbignbXV0YXRlbWUuemYudHJpZ2dlcicsIHRoaXMuX3Jlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIHRoZSBtZW51IGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZ2lzdGVyRXZlbnRzKCkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5zY3JvbGxUb3Ape1xuICAgICAgdGhpcy5fYmluZEhhbmRsZXIgPSB0aGlzLl9zY3JvbGxUb3AuYmluZCh0aGlzKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ29wZW4uemYuZHJpbGxkb3duIGhpZGUuemYuZHJpbGxkb3duIGNsb3NlZC56Zi5kcmlsbGRvd24nLHRoaXMuX2JpbmRIYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2Nyb2xsIHRvIFRvcCBvZiBFbGVtZW50IG9yIGRhdGEtc2Nyb2xsLXRvcC1lbGVtZW50XG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI3Njcm9sbG1lXG4gICAqL1xuICBfc2Nyb2xsVG9wKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICRzY3JvbGxUb3BFbGVtZW50ID0gX3RoaXMub3B0aW9ucy5zY3JvbGxUb3BFbGVtZW50IT0nJz8kKF90aGlzLm9wdGlvbnMuc2Nyb2xsVG9wRWxlbWVudCk6X3RoaXMuJGVsZW1lbnQsXG4gICAgICAgIHNjcm9sbFBvcyA9IHBhcnNlSW50KCRzY3JvbGxUb3BFbGVtZW50Lm9mZnNldCgpLnRvcCtfdGhpcy5vcHRpb25zLnNjcm9sbFRvcE9mZnNldCk7XG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2Nyb2xsUG9zIH0sIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nLGZ1bmN0aW9uKCl7XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBhZnRlciB0aGUgbWVudSBoYXMgc2Nyb2xsZWRcbiAgICAgICAgKiBAZXZlbnQgRHJpbGxkb3duI3Njcm9sbG1lXG4gICAgICAgICovXG4gICAgICBpZih0aGlzPT09JCgnaHRtbCcpWzBdKV90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Njcm9sbG1lLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMga2V5ZG93biBldmVudCBsaXN0ZW5lciB0byBgbGlgJ3MgaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfa2V5Ym9hcmRFdmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJG1lbnVJdGVtcy5hZGQodGhpcy4kZWxlbWVudC5maW5kKCcuanMtZHJpbGxkb3duLWJhY2sgPiBhLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbSA+IGEnKSkub24oJ2tleWRvd24uemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJykuY2hpbGRyZW4oJ2EnKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJpbGxkb3duJywge1xuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIC8vIERvbid0IHRhcCBmb2N1cyBvbiBmaXJzdCBlbGVtZW50IGluIHJvb3QgdWxcbiAgICAgICAgICByZXR1cm4gISRlbGVtZW50LmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJz4gbGk6Zmlyc3QtY2hpbGQgPiBhJykpO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICAvLyBEb24ndCB0YXAgZm9jdXMgb24gbGFzdCBlbGVtZW50IGluIHJvb3QgdWxcbiAgICAgICAgICByZXR1cm4gISRlbGVtZW50LmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJz4gbGk6bGFzdC1jaGlsZCA+IGEnKSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBEb24ndCBjbG9zZSBvbiBlbGVtZW50IGluIHJvb3QgdWxcbiAgICAgICAgICBpZiAoISRlbGVtZW50LmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJz4gbGkgPiBhJykpKSB7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoKS5wYXJlbnQoKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5wYXJlbnQoKS5zaWJsaW5ncygnYScpLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoISRlbGVtZW50LmlzKF90aGlzLiRtZW51SXRlbXMpKSB7IC8vIG5vdCBtZW51IGl0ZW0gbWVhbnMgYmFjayBidXR0b25cbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJGVsZW1lbnQuaXMoX3RoaXMuJHN1Ym1lbnVBbmNob3JzKSkge1xuICAgICAgICAgICAgX3RoaXMuX3Nob3coJGVsZW1lbnQucGFyZW50KCdsaScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLmZpbmQoJ3VsIGxpIGEnKS5maWx0ZXIoX3RoaXMuJG1lbnVJdGVtcykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pOyAvLyBlbmQga2V5Ym9hcmRBY2Nlc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIG9wZW4gZWxlbWVudHMsIGFuZCByZXR1cm5zIHRvIHJvb3QgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jY2xvc2VkXG4gICAqL1xuICBfaGlkZUFsbCgpIHtcbiAgICB2YXIgJGVsZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1kcmlsbGRvd24tc3VibWVudS5pcy1hY3RpdmUnKS5hZGRDbGFzcygnaXMtY2xvc2luZycpO1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLnBhcmVudCgpLmNsb3Nlc3QoJ3VsJykuZGF0YSgnY2FsY0hlaWdodCcpfSk7XG4gICAgJGVsZW0ub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKGUpe1xuICAgICAgJGVsZW0ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nJyk7XG4gICAgfSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGZ1bGx5IGNsb3NlZC5cbiAgICAgICAgICogQGV2ZW50IERyaWxsZG93biNjbG9zZWRcbiAgICAgICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYuZHJpbGxkb3duJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciBmb3IgZWFjaCBgYmFja2AgYnV0dG9uLCBhbmQgY2xvc2VzIG9wZW4gbWVudXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2JhY2tcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gYWRkIGBiYWNrYCBldmVudC5cbiAgICovXG4gIF9iYWNrKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpO1xuICAgICRlbGVtLmNoaWxkcmVuKCcuanMtZHJpbGxkb3duLWJhY2snKVxuICAgICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ21vdXNldXAgb24gYmFjaycpO1xuICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwYXJlbnQgc3VibWVudSwgY2FsbCBzaG93XG4gICAgICAgIGxldCBwYXJlbnRTdWJNZW51ID0gJGVsZW0ucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJyk7XG4gICAgICAgIGlmIChwYXJlbnRTdWJNZW51Lmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KHBhcmVudFN1Yk1lbnUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVyIHRvIG1lbnUgaXRlbXMgdy9vIHN1Ym1lbnVzIHRvIGNsb3NlIG9wZW4gbWVudXMgb24gY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21lbnVMaW5rRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm5vdCgnLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpXG4gICAgICAgIC5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpXG4gICAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgLy8gZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5faGlkZUFsbCgpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNvcGVuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gb3BlbiwgaS5lLiB0aGUgYGxpYCB0YWcuXG4gICAqL1xuICBfc2hvdygkZWxlbSkge1xuICAgIGlmKHRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB0aGlzLiR3cmFwcGVyLmNzcyh7aGVpZ2h0OiRlbGVtLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgICRlbGVtLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5hZGRDbGFzcygnaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2ludmlzaWJsZScpLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc3VibWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNoaWRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGhpZGUsIGkuZS4gdGhlIGB1bGAgdGFnLlxuICAgKi9cbiAgX2hpZGUoJGVsZW0pIHtcbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkgdGhpcy4kd3JhcHBlci5jc3Moe2hlaWdodDokZWxlbS5wYXJlbnQoKS5jbG9zZXN0KCd1bCcpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0ucGFyZW50KCdsaScpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gICAgJGVsZW0uYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKS5hZGRDbGFzcygnaXMtY2xvc2luZycpXG4gICAgJGVsZW0uYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKVxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICAgICAgICAgJGVsZW0uYmx1cigpLmFkZENsYXNzKCdpbnZpc2libGUnKTtcbiAgICAgICAgIH0pO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIGNsb3NlZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI2hpZGVcbiAgICAgKi9cbiAgICAkZWxlbS50cmlnZ2VyKCdoaWRlLnpmLmRyaWxsZG93bicsIFskZWxlbV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIHRocm91Z2ggdGhlIG5lc3RlZCBtZW51cyB0byBjYWxjdWxhdGUgdGhlIG1pbi1oZWlnaHQsIGFuZCBtYXgtd2lkdGggZm9yIHRoZSBtZW51LlxuICAgKiBQcmV2ZW50cyBjb250ZW50IGp1bXBpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldE1heERpbXMoKSB7XG4gICAgdmFyICBtYXhIZWlnaHQgPSAwLCByZXN1bHQgPSB7fSwgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJHN1Ym1lbnVzLmFkZCh0aGlzLiRlbGVtZW50KS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbnVtT2ZFbGVtcyA9ICQodGhpcykuY2hpbGRyZW4oJ2xpJykubGVuZ3RoO1xuICAgICAgdmFyIGhlaWdodCA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcykuaGVpZ2h0O1xuICAgICAgbWF4SGVpZ2h0ID0gaGVpZ2h0ID4gbWF4SGVpZ2h0ID8gaGVpZ2h0IDogbWF4SGVpZ2h0O1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSB7XG4gICAgICAgICQodGhpcykuZGF0YSgnY2FsY0hlaWdodCcsaGVpZ2h0KTtcbiAgICAgICAgaWYgKCEkKHRoaXMpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24tc3VibWVudScpKSByZXN1bHRbJ2hlaWdodCddID0gaGVpZ2h0O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5hdXRvSGVpZ2h0KSByZXN1bHRbJ21pbi1oZWlnaHQnXSA9IGAke21heEhlaWdodH1weGA7XG5cbiAgICByZXN1bHRbJ21heC13aWR0aCddID0gYCR7dGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aH1weGA7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBEcmlsbGRvd24gTWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYodGhpcy5vcHRpb25zLnNjcm9sbFRvcCkgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5kcmlsbGRvd24nLHRoaXMuX2JpbmRIYW5kbGVyKTtcbiAgICB0aGlzLl9oaWRlQWxsKCk7XG5cdCAgdGhpcy4kZWxlbWVudC5vZmYoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG4gICAgdGhpcy4kZWxlbWVudC51bndyYXAoKVxuICAgICAgICAgICAgICAgICAuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrLCAuaXMtc3VibWVudS1wYXJlbnQtaXRlbScpLnJlbW92ZSgpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCcuaXMtYWN0aXZlLCAuaXMtY2xvc2luZywgLmlzLWRyaWxsZG93bi1zdWJtZW51JykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nIGlzLWRyaWxsZG93bi1zdWJtZW51JylcbiAgICAgICAgICAgICAgICAgLmVuZCgpLmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4gdGFiaW5kZXggcm9sZScpO1xuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLm9mZignLnpmLmRyaWxsZG93bicpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kc3VibWVudXMucmVtb3ZlQ2xhc3MoJ2RyaWxsZG93bi1zdWJtZW51LWNvdmVyLXByZXZpb3VzJyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgJGxpbmsucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgICAgIGlmKCRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKXtcbiAgICAgICAgJGxpbmsuYXR0cignaHJlZicsICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKS5yZW1vdmVEYXRhKCdzYXZlZEhyZWYnKTtcbiAgICAgIH1lbHNleyByZXR1cm47IH1cbiAgICB9KTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cbkRyaWxsZG93bi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIGZvciBKUyBnZW5lcmF0ZWQgYmFjayBidXR0b24uIFByZXBlbmRlZCAgb3IgYXBwZW5kZWQgKHNlZSBiYWNrQnV0dG9uUG9zaXRpb24pIHRvIHN1Ym1lbnUgbGlzdHMgYW5kIGRlbGV0ZWQgb24gYGRlc3Ryb3lgIG1ldGhvZCwgJ2pzLWRyaWxsZG93bi1iYWNrJyBjbGFzcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJzxsaSBjbGFzcz1cImpzLWRyaWxsZG93bi1iYWNrXCI+PGEgdGFiaW5kZXg9XCIwXCI+QmFjazwvYT48L2xpPidcbiAgICovXG4gIGJhY2tCdXR0b246ICc8bGkgY2xhc3M9XCJqcy1kcmlsbGRvd24tYmFja1wiPjxhIHRhYmluZGV4PVwiMFwiPkJhY2s8L2E+PC9saT4nLFxuICAvKipcbiAgICogUG9zaXRpb24gdGhlIGJhY2sgYnV0dG9uIGVpdGhlciBhdCB0aGUgdG9wIG9yIGJvdHRvbSBvZiBkcmlsbGRvd24gc3VibWVudXMuIENhbiBiZSBgJ2xlZnQnYCBvciBgJ2JvdHRvbSdgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0IHRvcFxuICAgKi9cbiAgYmFja0J1dHRvblBvc2l0aW9uOiAndG9wJyxcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIHRvIHdyYXAgZHJpbGxkb3duIG1lbnUuIFVzZSBhIGNsYXNzIG5hbWUgZm9yIGluZGVwZW5kZW50IHN0eWxpbmc7IHRoZSBKUyBhcHBsaWVkIGNsYXNzOiBgaXMtZHJpbGxkb3duYCBpcyByZXF1aXJlZC4gUmVtb3ZlIHRoZSBiYWNrc2xhc2ggKGBcXGApIGlmIGNvcHkgYW5kIHBhc3RpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJzxkaXY+PC9kaXY+J1xuICAgKi9cbiAgd3JhcHBlcjogJzxkaXY+PC9kaXY+JyxcbiAgLyoqXG4gICAqIEFkZHMgdGhlIHBhcmVudCBsaW5rIHRvIHRoZSBzdWJtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcGFyZW50TGluazogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byByZXR1cm4gdG8gcm9vdCBsaXN0IG9uIGJvZHkgY2xpY2suXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gYXV0byBhZGp1c3QgaGVpZ2h0LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgYXV0b0hlaWdodDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbmltYXRlIHRoZSBhdXRvIGFkanVzdCBoZWlnaHQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhbmltYXRlSGVpZ2h0OiBmYWxzZSxcbiAgLyoqXG4gICAqIFNjcm9sbCB0byB0aGUgdG9wIG9mIHRoZSBtZW51IGFmdGVyIG9wZW5pbmcgYSBzdWJtZW51IG9yIG5hdmlnYXRpbmcgYmFjayB1c2luZyB0aGUgbWVudSBiYWNrIGJ1dHRvblxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgc2Nyb2xsVG9wOiBmYWxzZSxcbiAgLyoqXG4gICAqIFN0cmluZyBqcXVlcnkgc2VsZWN0b3IgKGZvciBleGFtcGxlICdib2R5Jykgb2YgZWxlbWVudCB0byB0YWtlIG9mZnNldCgpLnRvcCBmcm9tLCBpZiBlbXB0eSBzdHJpbmcgdGhlIGRyaWxsZG93biBtZW51IG9mZnNldCgpLnRvcCBpcyB0YWtlblxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBzY3JvbGxUb3BFbGVtZW50OiAnJyxcbiAgLyoqXG4gICAqIFNjcm9sbFRvcCBvZmZzZXRcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAwXG4gICAqL1xuICBzY3JvbGxUb3BPZmZzZXQ6IDAsXG4gIC8qKlxuICAgKiBTY3JvbGwgYW5pbWF0aW9uIGR1cmF0aW9uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgNTAwXG4gICAqL1xuICBhbmltYXRpb25EdXJhdGlvbjogNTAwLFxuICAvKipcbiAgICogU2Nyb2xsIGFuaW1hdGlvbiBlYXNpbmcuIENhbiBiZSBgJ3N3aW5nJ2Agb3IgYCdsaW5lYXInYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAc2VlIHtAbGluayBodHRwczovL2FwaS5qcXVlcnkuY29tL2FuaW1hdGV8SlF1ZXJ5IGFuaW1hdGV9XG4gICAqIEBkZWZhdWx0ICdzd2luZydcbiAgICovXG4gIGFuaW1hdGlvbkVhc2luZzogJ3N3aW5nJ1xuICAvLyBob2xkT3BlbjogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcmlsbGRvd24sICdEcmlsbGRvd24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyb3Bkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcm9wZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBEcm9wZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJvcGRvd24uXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24uXG4gICAqICAgICAgICBPYmplY3Qgc2hvdWxkIGJlIG9mIHRoZSBkcm9wZG93biBwYW5lbCwgcmF0aGVyIHRoYW4gaXRzIGFuY2hvci5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJvcGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgc2V0dGluZy9jaGVja2luZyBvcHRpb25zIGFuZCBhdHRyaWJ1dGVzLCBhZGRpbmcgaGVscGVyIHZhcmlhYmxlcywgYW5kIHNhdmluZyB0aGUgYW5jaG9yLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKSA6ICQoYFtkYXRhLW9wZW49XCIkeyRpZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6ICRpZCxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2VcblxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLnBhcmVudENsYXNzKXtcbiAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsZW1lbnQucGFyZW50cygnLicgKyB0aGlzLm9wdGlvbnMucGFyZW50Q2xhc3MpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy4kcGFyZW50ID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6ICRpZCxcbiAgICAgICdhcmlhLWxhYmVsbGVkYnknOiB0aGlzLiRhbmNob3JbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZGQtYW5jaG9yJylcbiAgICB9KTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGN1cnJlbnQgb3JpZW50YXRpb24gb2YgZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IHBvc2l0aW9uIC0gc3RyaW5nIHZhbHVlIG9mIGEgcG9zaXRpb24gY2xhc3MuXG4gICAqL1xuICBnZXRQb3NpdGlvbkNsYXNzKCkge1xuICAgIHZhciB2ZXJ0aWNhbFBvc2l0aW9uID0gdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyh0b3B8bGVmdHxyaWdodHxib3R0b20pL2cpO1xuICAgICAgICB2ZXJ0aWNhbFBvc2l0aW9uID0gdmVydGljYWxQb3NpdGlvbiA/IHZlcnRpY2FsUG9zaXRpb25bMF0gOiAnJztcbiAgICB2YXIgaG9yaXpvbnRhbFBvc2l0aW9uID0gL2Zsb2F0LShcXFMrKS8uZXhlYyh0aGlzLiRhbmNob3JbMF0uY2xhc3NOYW1lKTtcbiAgICAgICAgaG9yaXpvbnRhbFBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uWzFdIDogJyc7XG4gICAgdmFyIHBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uICsgJyAnICsgdmVydGljYWxQb3NpdGlvbiA6IHZlcnRpY2FsUG9zaXRpb247XG5cbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyB0aGUgZHJvcGRvd24gcGFuZXMgb3JpZW50YXRpb24gYnkgYWRkaW5nL3JlbW92aW5nIHBvc2l0aW9uaW5nIGNsYXNzZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbiBjbGFzcyB0byByZW1vdmUuXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIHBhbmUsIGNoZWNrcyBmb3IgY29sbGlzaW9ucy5cbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICBpZih0aGlzLiRhbmNob3IuYXR0cignYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXG4gICAgICAgICRlbGVEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGFuY2hvciksXG4gICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XG5cbiAgICBpZigoJGVsZURpbXMud2lkdGggPj0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy4kZWxlbWVudCwgdGhpcy4kcGFyZW50KSkpe1xuICAgICAgdmFyIG5ld1dpZHRoID0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCxcbiAgICAgICAgICBwYXJlbnRIT2Zmc2V0ID0gMDtcbiAgICAgIGlmKHRoaXMuJHBhcmVudCl7XG4gICAgICAgIHZhciAkcGFyZW50RGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kcGFyZW50KSxcbiAgICAgICAgICAgIHBhcmVudEhPZmZzZXQgPSAkcGFyZW50RGltcy5vZmZzZXQubGVmdDtcbiAgICAgICAgaWYgKCRwYXJlbnREaW1zLndpZHRoIDwgbmV3V2lkdGgpe1xuICAgICAgICAgIG5ld1dpZHRoID0gJHBhcmVudERpbXMud2lkdGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0ICsgcGFyZW50SE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6IG5ld1dpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCBwb3NpdGlvbiwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCB0aGlzLiRwYXJlbnQsIHRydWUpICYmIHRoaXMuY291bnRlcil7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBlbGVtZW50IHV0aWxpemluZyB0aGUgdHJpZ2dlcnMgdXRpbGl0eSBsaWJyYXJ5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fc2V0UG9zaXRpb24uYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmhvdmVyKXtcbiAgICAgIHRoaXMuJGFuY2hvci5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYm9keURhdGEgPSAkKCdib2R5JykuZGF0YSgpO1xuICAgICAgICBpZih0eXBlb2YoYm9keURhdGEud2hhdGlucHV0KSA9PT0gJ3VuZGVmaW5lZCcgfHwgYm9keURhdGEud2hhdGlucHV0ID09PSAnbW91c2UnKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgfSk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXJQYW5lKXtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy4kYW5jaG9yLmFkZCh0aGlzLiRlbGVtZW50KS5vbigna2V5ZG93bi56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpLFxuICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoX3RoaXMuJGVsZW1lbnQpO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd24nLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KS5ub3QodGhpcy4kZWxlbWVudCksXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignY2xpY2suemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpO1xuICAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jY2xvc2VtZVxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xuICAgKi9cbiAgb3BlbigpIHtcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIG90aGVyIG9wZW4gZHJvcGRvd25zLCB0eXBpY2FsbHkgd2hlbiBkcm9wZG93biBpcyBvcGVuaW5nXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYuZHJvcGRvd24nLCB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgLy8gdGhpcy4kZWxlbWVudC8qLnNob3coKSovO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcbiAgICAgICAgJGZvY3VzYWJsZS5lcSgwKS5mb2N1cygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2speyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd24jc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBvcGVuIGRyb3Bkb3duIHBhbmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jaGlkZVxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuXG4gICAgdGhpcy4kYW5jaG9yLnJlbW92ZUNsYXNzKCdob3ZlcicpXG4gICAgICAgIC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuXG4gICAgaWYodGhpcy5jbGFzc0NoYW5nZWQpe1xuICAgICAgdmFyIGN1clBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICAgIGlmKGN1clBvc2l0aW9uQ2xhc3Mpe1xuICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGN1clBvc2l0aW9uQ2xhc3MpO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcylcbiAgICAgICAgICAvKi5oaWRlKCkqLy5jc3Moe2hlaWdodDogJycsIHdpZHRoOiAnJ30pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgICB0aGlzLnVzZWRQb3NpdGlvbnMubGVuZ3RoID0gMDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgbm8gbG9uZ2VyIHZpc2libGUuXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2hpZGVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMpIHtcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVsZWFzZUZvY3VzKHRoaXMuJGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBkcm9wZG93biBwYW5lJ3MgdmlzaWJpbGl0eS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIGlmKHRoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicpKSByZXR1cm47XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGRyb3Bkb3duLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyJykuaGlkZSgpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56Zi5kcm9wZG93bicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkRyb3Bkb3duLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQ2xhc3MgdGhhdCBkZXNpZ25hdGVzIGJvdW5kaW5nIGNvbnRhaW5lciBvZiBEcm9wZG93biAoZGVmYXVsdDogd2luZG93KVxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgKiBAZGVmYXVsdCBudWxsXG4gICAqL1xuICBwYXJlbnRDbGFzczogbnVsbCxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDI1MFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjUwLFxuICAvKipcbiAgICogQWxsb3cgc3VibWVudXMgdG8gb3BlbiBvbiBob3ZlciBldmVudHNcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIERvbid0IGNsb3NlIGRyb3Bkb3duIHdoZW4gaG92ZXJpbmcgb3ZlciBkcm9wZG93biBwYW5lXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBob3ZlclBhbmU6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyBiZXR3ZWVuIHRoZSBkcm9wZG93biBwYW5lIGFuZCB0aGUgdHJpZ2dlcmluZyBlbGVtZW50IG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMVxuICAgKi9cbiAgdk9mZnNldDogMSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIGhPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGFkanVzdCBvcGVuIHBvc2l0aW9uLiBKUyB3aWxsIHRlc3QgYW5kIGZpbGwgdGhpcyBpbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgcGx1Z2luIHRvIHRyYXAgZm9jdXMgdG8gdGhlIGRyb3Bkb3duIHBhbmUgaWYgb3BlbmVkIHdpdGgga2V5Ym9hcmQgY29tbWFuZHMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byBzZXQgZm9jdXMgdG8gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IHdpdGhpbiB0aGUgcGFuZSwgcmVnYXJkbGVzcyBvZiBtZXRob2Qgb2Ygb3BlbmluZy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgYSBjbGljayBvbiB0aGUgYm9keSB0byBjbG9zZSB0aGUgZHJvcGRvd24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcblxuICBfaXNWZXJ0aWNhbCgpIHtcbiAgICByZXR1cm4gdGhpcy4kdGFicy5jc3MoJ2Rpc3BsYXknKSA9PT0gJ2Jsb2NrJztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxuICAgICAgICBwYXJDbGFzcyA9ICdpcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCc7XG5cbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcbiAgICB2YXIgaGFuZGxlQ2xpY2tGbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCBgLiR7cGFyQ2xhc3N9YCksXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxuICAgICAgICAgIGhhc0NsaWNrZWQgPSAkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG5cbiAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgaWYgKGhhc0NsaWNrZWQpIHtcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrT3BlbiB8fCBoYXNUb3VjaCkge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdjbGljay56Zi5kcm9wZG93bm1lbnUgdG91Y2hzdGFydC56Zi5kcm9wZG93bm1lbnUnLCBoYW5kbGVDbGlja0ZuKTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgTGVhZiBlbGVtZW50IENsaWNrc1xuICAgIGlmKF90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrSW5zaWRlKXtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignY2xpY2suemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZighaGFzU3ViKXtcbiAgICAgICAgICBfdGhpcy5faGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciAkZWxlbSA9ICQodGhpcyksXG4gICAgICAgICAgICBoYXNTdWIgPSAkZWxlbS5oYXNDbGFzcyhwYXJDbGFzcyk7XG5cbiAgICAgICAgaWYgKGhhc1N1Yikge1xuICAgICAgICAgIGNsZWFyVGltZW91dCgkZWxlbS5kYXRhKCdfZGVsYXknKSk7XG4gICAgICAgICAgJGVsZW0uZGF0YSgnX2RlbGF5Jywgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtLmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudScpKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpKTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KCRlbGVtLmRhdGEoJ19kZWxheScpKTtcbiAgICAgICAgICAkZWxlbS5kYXRhKCdfZGVsYXknLCBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuY2xvc2luZ1RpbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuJG1lbnVJdGVtcy5vbigna2V5ZG93bi56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ1tyb2xlPVwibWVudWl0ZW1cIl0nKSxcbiAgICAgICAgICBpc1RhYiA9IF90aGlzLiR0YWJzLmluZGV4KCRlbGVtZW50KSA+IC0xLFxuICAgICAgICAgICRlbGVtZW50cyA9IGlzVGFiID8gX3RoaXMuJHRhYnMgOiAkZWxlbWVudC5zaWJsaW5ncygnbGknKS5hZGQoJGVsZW1lbnQpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKGkrMSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIG5leHRTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghJGVsZW1lbnQuaXMoJzpsYXN0LWNoaWxkJykpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJldlNpYmxpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHByZXZFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSwgb3BlblN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJHN1YiA9ICRlbGVtZW50LmNoaWxkcmVuKCd1bC5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG4gICAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzLl9zaG93KCRzdWIpO1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ2xpID4gYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2UgeyByZXR1cm47IH1cbiAgICAgIH0sIGNsb3NlU3ViID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vaWYgKCRlbGVtZW50LmlzKCc6Zmlyc3QtY2hpbGQnKSkge1xuICAgICAgICB2YXIgY2xvc2UgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpO1xuICAgICAgICBjbG9zZS5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIF90aGlzLl9oaWRlKGNsb3NlKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAvL31cbiAgICAgIH07XG4gICAgICB2YXIgZnVuY3Rpb25zID0ge1xuICAgICAgICBvcGVuOiBvcGVuU3ViLFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoX3RoaXMuJGVsZW1lbnQpO1xuICAgICAgICAgIF90aGlzLiRtZW51SXRlbXMuZmluZCgnYTpmaXJzdCcpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmIChpc1RhYikge1xuICAgICAgICBpZiAoX3RoaXMuX2lzVmVydGljYWwoKSkgeyAvLyB2ZXJ0aWNhbCBtZW51XG4gICAgICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkpIHsgLy8gcmlnaHQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgICBwcmV2aW91czogb3BlblN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgIHVwOiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgbmV4dDogb3BlblN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIGhvcml6b250YWwgbWVudVxuICAgICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBuZXh0OiBwcmV2U2libGluZyxcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIG5leHQ6IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICBwcmV2aW91czogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIGRvd246IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHVwOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvLyBub3QgdGFicyAtPiBvbmUgc3ViXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IGNsb3NlU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICBwcmV2aW91czogY2xvc2VTdWIsXG4gICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgIHVwOiBwcmV2U2libGluZ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd25NZW51JywgZnVuY3Rpb25zKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGUgYm9keSB0byBjbG9zZSBhbnkgZHJvcGRvd25zIG9uIGEgY2xpY2suXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2FkZEJvZHlIYW5kbGVyKCkge1xuICAgIHZhciAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICAkYm9keS5vZmYoJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScpXG4gICAgICAgICAub24oJ21vdXNldXAuemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgdmFyICRsaW5rID0gX3RoaXMuJGVsZW1lbnQuZmluZChlLnRhcmdldCk7XG4gICAgICAgICAgIGlmICgkbGluay5sZW5ndGgpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgX3RoaXMuX2hpZGUoKTtcbiAgICAgICAgICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgZHJvcGRvd24gcGFuZSwgYW5kIGNoZWNrcyBmb3IgY29sbGlzaW9ucyBmaXJzdC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRzdWIgLSB1bCBlbGVtZW50IHRoYXQgaXMgYSBzdWJtZW51IHRvIHNob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBmaXJlcyBEcm9wZG93bk1lbnUjc2hvd1xuICAgKi9cbiAgX3Nob3coJHN1Yikge1xuICAgIHZhciBpZHggPSB0aGlzLiR0YWJzLmluZGV4KHRoaXMuJHRhYnMuZmlsdGVyKGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICByZXR1cm4gJChlbCkuZmluZCgkc3ViKS5sZW5ndGggPiAwO1xuICAgIH0pKTtcbiAgICB2YXIgJHNpYnMgPSAkc3ViLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5zaWJsaW5ncygnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLl9oaWRlKCRzaWJzLCBpZHgpO1xuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLmFkZENsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKVxuICAgICAgICAucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB2YXIgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgIGlmICghY2xlYXIpIHtcbiAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICctcmlnaHQnIDogJy1sZWZ0JyxcbiAgICAgICAgICAkcGFyZW50TGkgPSAkc3ViLnBhcmVudCgnLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zJHtvbGRDbGFzc31gKS5hZGRDbGFzcyhgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApO1xuICAgICAgY2xlYXIgPSBGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KCRzdWIsIG51bGwsIHRydWUpO1xuICAgICAgaWYgKCFjbGVhcikge1xuICAgICAgICAkcGFyZW50TGkucmVtb3ZlQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKS5hZGRDbGFzcygnb3BlbnMtaW5uZXInKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hhbmdlZCA9IHRydWU7XG4gICAgfVxuICAgICRzdWIuY3NzKCd2aXNpYmlsaXR5JywgJycpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7IHRoaXMuX2FkZEJvZHlIYW5kbGVyKCk7IH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBuZXcgZHJvcGRvd24gcGFuZSBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bm1lbnUnLCBbJHN1Yl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc2luZ2xlLCBjdXJyZW50bHkgb3BlbiBkcm9wZG93biBwYW5lLCBpZiBwYXNzZWQgYSBwYXJhbWV0ZXIsIG90aGVyd2lzZSwgaGlkZXMgZXZlcnl0aGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIGVsZW1lbnQgd2l0aCBhIHN1Ym1lbnUgdG8gaGlkZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gaW5kZXggb2YgdGhlICR0YWJzIGNvbGxlY3Rpb24gdG8gaGlkZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hpZGUoJGVsZW0sIGlkeCkge1xuICAgIHZhciAkdG9DbG9zZTtcbiAgICBpZiAoJGVsZW0gJiYgJGVsZW0ubGVuZ3RoKSB7XG4gICAgICAkdG9DbG9zZSA9ICRlbGVtO1xuICAgIH0gZWxzZSBpZiAoaWR4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kdGFicy5ub3QoZnVuY3Rpb24oaSwgZWwpIHtcbiAgICAgICAgcmV0dXJuIGkgPT09IGlkeDtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICR0b0Nsb3NlID0gdGhpcy4kZWxlbWVudDtcbiAgICB9XG4gICAgdmFyIHNvbWV0aGluZ1RvQ2xvc2UgPSAkdG9DbG9zZS5oYXNDbGFzcygnaXMtYWN0aXZlJykgfHwgJHRvQ2xvc2UuZmluZCgnLmlzLWFjdGl2ZScpLmxlbmd0aCA+IDA7XG5cbiAgICBpZiAoc29tZXRoaW5nVG9DbG9zZSkge1xuICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtYWN0aXZlJykuYWRkKCR0b0Nsb3NlKS5hdHRyKHtcbiAgICAgICAgJ2RhdGEtaXMtY2xpY2snOiBmYWxzZVxuICAgICAgfSkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICAkdG9DbG9zZS5maW5kKCd1bC5qcy1kcm9wZG93bi1hY3RpdmUnKS5yZW1vdmVDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJyk7XG5cbiAgICAgIGlmICh0aGlzLmNoYW5nZWQgfHwgJHRvQ2xvc2UuZmluZCgnb3BlbnMtaW5uZXInKS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9sZENsYXNzID0gdGhpcy5vcHRpb25zLmFsaWdubWVudCA9PT0gJ2xlZnQnID8gJ3JpZ2h0JyA6ICdsZWZ0JztcbiAgICAgICAgJHRvQ2xvc2UuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGQoJHRvQ2xvc2UpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGBvcGVucy1pbm5lciBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYG9wZW5zLSR7b2xkQ2xhc3N9YCk7XG4gICAgICAgIHRoaXMuY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvcGVuIG1lbnVzIGFyZSBjbG9zZWQuXG4gICAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I2hpZGVcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3dubWVudScsIFskdG9DbG9zZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kbWVudUl0ZW1zLm9mZignLnpmLmRyb3Bkb3dubWVudScpLnJlbW92ZUF0dHIoJ2RhdGEtaXMtY2xpY2snKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2lzLXJpZ2h0LWFycm93IGlzLWxlZnQtYXJyb3cgaXMtZG93bi1hcnJvdyBvcGVucy1yaWdodCBvcGVucy1sZWZ0IG9wZW5zLWlubmVyJyk7XG4gICAgJChkb2N1bWVudC5ib2R5KS5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLk5lc3QuQnVybih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRHJvcGRvd25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRGlzYWxsb3dzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgc3VibWVudXNcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gYXV0b21hdGljYWxseSBjbG9zZSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQsIGlmIG5vdCBjbGlja2VkIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGF1dG9jbG9zZTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDUwXG4gICAqL1xuICBob3ZlckRlbGF5OiA1MCxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBvcGVuL3JlbWFpbiBvcGVuIG9uIHBhcmVudCBjbGljayBldmVudC4gQWxsb3dzIGN1cnNvciB0byBtb3ZlIGF3YXkgZnJvbSBtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgY2xpY2tPcGVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IGNsb3NpbmcgYSBzdWJtZW51IG9uIGEgbW91c2VsZWF2ZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCA1MDBcbiAgICovXG5cbiAgY2xvc2luZ1RpbWU6IDUwMCxcbiAgLyoqXG4gICAqIFBvc2l0aW9uIG9mIHRoZSBtZW51IHJlbGF0aXZlIHRvIHdoYXQgZGlyZWN0aW9uIHRoZSBzdWJtZW51cyBzaG91bGQgb3Blbi4gSGFuZGxlZCBieSBKUy4gQ2FuIGJlIGAnbGVmdCdgIG9yIGAncmlnaHQnYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnbGVmdCdcbiAgICovXG4gIGFsaWdubWVudDogJ2xlZnQnLFxuICAvKipcbiAgICogQWxsb3cgY2xpY2tzIG9uIHRoZSBib2R5IHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvdyBjbGlja3Mgb24gbGVhZiBhbmNob3IgbGlua3MgdG8gY2xvc2UgYW55IG9wZW4gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGNsb3NlT25DbGlja0luc2lkZTogdHJ1ZSxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdmVydGljYWwgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgdmVydGljYWxgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAndmVydGljYWwnXG4gICAqL1xuICB2ZXJ0aWNhbENsYXNzOiAndmVydGljYWwnLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byByaWdodC1zaWRlIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYGFsaWduLXJpZ2h0YC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2FsaWduLXJpZ2h0J1xuICAgKi9cbiAgcmlnaHRDbGFzczogJ2FsaWduLXJpZ2h0JyxcbiAgLyoqXG4gICAqIEJvb2xlYW4gdG8gZm9yY2Ugb3ZlcmlkZSB0aGUgY2xpY2tpbmcgb2YgbGlua3MgdG8gcGVyZm9ybSBkZWZhdWx0IGFjdGlvbiwgb24gc2Vjb25kIHRvdWNoIGV2ZW50IGZvciBtb2JpbGUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGZvcmNlRm9sbG93OiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJvcGRvd25NZW51LCAnRHJvcGRvd25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBFcXVhbGl6ZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmVxdWFsaXplclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgZXF1YWxpemVyIGNvbnRhaW5zIGltYWdlc1xuICovXG5cbmNsYXNzIEVxdWFsaXplciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEVxdWFsaXplci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEVxdWFsaXplciBwbHVnaW4gYW5kIGNhbGxzIGZ1bmN0aW9ucyB0byBnZXQgZXF1YWxpemVyIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZXFJZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1lcXVhbGl6ZXInKSB8fCAnJztcbiAgICB2YXIgJHdhdGNoZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYFtkYXRhLWVxdWFsaXplci13YXRjaD1cIiR7ZXFJZH1cIl1gKTtcblxuICAgIHRoaXMuJHdhdGNoZWQgPSAkd2F0Y2hlZC5sZW5ndGggPyAkd2F0Y2hlZCA6IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyLXdhdGNoXScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1yZXNpemUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cdHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnLCAoZXFJZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdlcScpKSk7XG5cbiAgICB0aGlzLmhhc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc05lc3RlZCA9IHRoaXMuJGVsZW1lbnQucGFyZW50c1VudGlsKGRvY3VtZW50LmJvZHksICdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLl9iaW5kSGFuZGxlciA9IHtcbiAgICAgIG9uUmVzaXplTWVCb3VuZDogdGhpcy5fb25SZXNpemVNZS5iaW5kKHRoaXMpLFxuICAgICAgb25Qb3N0RXF1YWxpemVkQm91bmQ6IHRoaXMuX29uUG9zdEVxdWFsaXplZC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHZhciBpbWdzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKTtcbiAgICB2YXIgdG9vU21hbGw7XG4gICAgaWYodGhpcy5vcHRpb25zLmVxdWFsaXplT24pe1xuICAgICAgdG9vU21hbGwgPSB0aGlzLl9jaGVja01RKCk7XG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX2NoZWNrTVEuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLl9ldmVudHMoKTtcbiAgICB9XG4gICAgaWYoKHRvb1NtYWxsICE9PSB1bmRlZmluZWQgJiYgdG9vU21hbGwgPT09IGZhbHNlKSB8fCB0b29TbWFsbCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGlmKGltZ3MubGVuZ3RoKXtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZChpbWdzLCB0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5fcmVmbG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzIGlmIHRoZSBicmVha3BvaW50IGlzIHRvbyBzbWFsbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXVzZUV2ZW50cygpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZih7XG4gICAgICAnLnpmLmVxdWFsaXplcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmQsXG5cdCAgJ211dGF0ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHJlc2l6ZW1lLnpmLnRyaWdnZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25SZXNpemVNZShlKSB7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyBwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUG9zdEVxdWFsaXplZChlKSB7XG4gICAgaWYoZS50YXJnZXQgIT09IHRoaXMuJGVsZW1lbnRbMF0peyB0aGlzLl9yZWZsb3coKTsgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgRXF1YWxpemVyLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgaWYodGhpcy5oYXNOZXN0ZWQpe1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcblx0ICB0aGlzLiRlbGVtZW50Lm9uKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kKTtcbiAgICB9XG4gICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCB0byB0aGUgbWluaW11bSByZXF1aXJlZCBzaXplLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTVEoKSB7XG4gICAgdmFyIHRvb1NtYWxsID0gIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5pcyh0aGlzLm9wdGlvbnMuZXF1YWxpemVPbik7XG4gICAgaWYodG9vU21hbGwpe1xuICAgICAgaWYodGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICB9XG4gICAgfWVsc2V7XG4gICAgICBpZighdGhpcy5pc09uKXtcbiAgICAgICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0b29TbWFsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIG5vb3AgdmVyc2lvbiBmb3IgdGhlIHBsdWdpblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tpbGxzd2l0Y2goKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEVxdWFsaXplciB1cG9uIERPTSBjaGFuZ2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgaWYoIXRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uU3RhY2spe1xuICAgICAgaWYodGhpcy5faXNTdGFja2VkKCkpe1xuICAgICAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmVxdWFsaXplQnlSb3cpIHtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0c0J5Um93KHRoaXMuYXBwbHlIZWlnaHRCeVJvdy5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuZ2V0SGVpZ2h0cyh0aGlzLmFwcGx5SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNYW51YWxseSBkZXRlcm1pbmVzIGlmIHRoZSBmaXJzdCAyIGVsZW1lbnRzIGFyZSAqTk9UKiBzdGFja2VkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2lzU3RhY2tlZCgpIHtcbiAgICBpZiAoIXRoaXMuJHdhdGNoZWRbMF0gfHwgIXRoaXMuJHdhdGNoZWRbMV0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4kd2F0Y2hlZFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgIT09IHRoaXMuJHdhdGNoZWRbMV0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGhlaWdodHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyXG4gICAqL1xuICBnZXRIZWlnaHRzKGNiKSB7XG4gICAgdmFyIGhlaWdodHMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgaGVpZ2h0cy5wdXNoKHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0KTtcbiAgICB9XG4gICAgY2IoaGVpZ2h0cyk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIG91dGVyIGhlaWdodHMgb2YgY2hpbGRyZW4gY29udGFpbmVkIHdpdGhpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IGFuZCByZXR1cm5zIHRoZW0gaW4gYW4gYXJyYXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBBIG5vbi1vcHRpb25hbCBjYWxsYmFjayB0byByZXR1cm4gdGhlIGhlaWdodHMgYXJyYXkgdG8uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gZ3JvdXBzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lciBncm91cGVkIGJ5IHJvdyB3aXRoIGVsZW1lbnQsaGVpZ2h0IGFuZCBtYXggYXMgbGFzdCBjaGlsZFxuICAgKi9cbiAgZ2V0SGVpZ2h0c0J5Um93KGNiKSB7XG4gICAgdmFyIGxhc3RFbFRvcE9mZnNldCA9ICh0aGlzLiR3YXRjaGVkLmxlbmd0aCA/IHRoaXMuJHdhdGNoZWQuZmlyc3QoKS5vZmZzZXQoKS50b3AgOiAwKSxcbiAgICAgICAgZ3JvdXBzID0gW10sXG4gICAgICAgIGdyb3VwID0gMDtcbiAgICAvL2dyb3VwIGJ5IFJvd1xuICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0aGlzLiR3YXRjaGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKXtcbiAgICAgIHRoaXMuJHdhdGNoZWRbaV0uc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgLy9tYXliZSBjb3VsZCB1c2UgdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRUb3BcbiAgICAgIHZhciBlbE9mZnNldFRvcCA9ICQodGhpcy4kd2F0Y2hlZFtpXSkub2Zmc2V0KCkudG9wO1xuICAgICAgaWYgKGVsT2Zmc2V0VG9wIT1sYXN0RWxUb3BPZmZzZXQpIHtcbiAgICAgICAgZ3JvdXArKztcbiAgICAgICAgZ3JvdXBzW2dyb3VwXSA9IFtdO1xuICAgICAgICBsYXN0RWxUb3BPZmZzZXQ9ZWxPZmZzZXRUb3A7XG4gICAgICB9XG4gICAgICBncm91cHNbZ3JvdXBdLnB1c2goW3RoaXMuJHdhdGNoZWRbaV0sdGhpcy4kd2F0Y2hlZFtpXS5vZmZzZXRIZWlnaHRdKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMCwgbG4gPSBncm91cHMubGVuZ3RoOyBqIDwgbG47IGorKykge1xuICAgICAgdmFyIGhlaWdodHMgPSAkKGdyb3Vwc1tqXSkubWFwKGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzWzFdOyB9KS5nZXQoKTtcbiAgICAgIHZhciBtYXggICAgICAgICA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgICAgZ3JvdXBzW2pdLnB1c2gobWF4KTtcbiAgICB9XG4gICAgY2IoZ3JvdXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGFuZ2VzIHRoZSBDU1MgaGVpZ2h0IHByb3BlcnR5IG9mIGVhY2ggY2hpbGQgaW4gYW4gRXF1YWxpemVyIHBhcmVudCB0byBtYXRjaCB0aGUgdGFsbGVzdFxuICAgKiBAcGFyYW0ge2FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3ByZWVxdWFsaXplZFxuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0KGhlaWdodHMpIHtcbiAgICB2YXIgbWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgaGVpZ2h0cyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICogQGV2ZW50IEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcblxuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCBtYXgpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3QgYnkgcm93XG4gICAqIEBwYXJhbSB7YXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRyb3dcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkcm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFxuICAgKi9cbiAgYXBwbHlIZWlnaHRCeVJvdyhncm91cHMpIHtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgYXJlIGFwcGxpZWRcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZ3JvdXBzLmxlbmd0aDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgdmFyIGdyb3Vwc0lMZW5ndGggPSBncm91cHNbaV0ubGVuZ3RoLFxuICAgICAgICAgIG1heCA9IGdyb3Vwc1tpXVtncm91cHNJTGVuZ3RoIC0gMV07XG4gICAgICBpZiAoZ3JvdXBzSUxlbmd0aDw9Mikge1xuICAgICAgICAkKGdyb3Vwc1tpXVswXVswXSkuY3NzKHsnaGVpZ2h0JzonYXV0byd9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAgKiBGaXJlcyBiZWZvcmUgdGhlIGhlaWdodHMgcGVyIHJvdyBhcmUgYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkcm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3ByZWVxdWFsaXplZHJvdy56Zi5lcXVhbGl6ZXInKTtcbiAgICAgIGZvciAodmFyIGogPSAwLCBsZW5KID0gKGdyb3Vwc0lMZW5ndGgtMSk7IGogPCBsZW5KIDsgaisrKSB7XG4gICAgICAgICQoZ3JvdXBzW2ldW2pdWzBdKS5jc3MoeydoZWlnaHQnOm1heH0pO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGVpZ2h0cyBwZXIgcm93IGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICAgICogQGV2ZW50IEVxdWFsaXplciNwb3N0ZXF1YWxpemVkcm93XG4gICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Bvc3RlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIEVxdWFsaXplci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuRXF1YWxpemVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogRW5hYmxlIGhlaWdodCBlcXVhbGl6YXRpb24gd2hlbiBzdGFja2VkIG9uIHNtYWxsZXIgc2NyZWVucy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGVxdWFsaXplT25TdGFjazogZmFsc2UsXG4gIC8qKlxuICAgKiBFbmFibGUgaGVpZ2h0IGVxdWFsaXphdGlvbiByb3cgYnkgcm93LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZXF1YWxpemVCeVJvdzogZmFsc2UsXG4gIC8qKlxuICAgKiBTdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSB0aGUgcGx1Z2luIHNob3VsZCBlcXVhbGl6ZSBoZWlnaHRzIG9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBlcXVhbGl6ZU9uOiAnJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEVxdWFsaXplciwgJ0VxdWFsaXplcicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogSW50ZXJjaGFuZ2UgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmludGVyY2hhbmdlXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlclxuICovXG5cbmNsYXNzIEludGVyY2hhbmdlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgSW50ZXJjaGFuZ2UuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgSW50ZXJjaGFuZ2UjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEludGVyY2hhbmdlLmRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnJ1bGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnSW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgSW50ZXJjaGFuZ2UgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGludGVyY2hhbmdlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5fYWRkQnJlYWtwb2ludHMoKTtcbiAgICB0aGlzLl9nZW5lcmF0ZVJ1bGVzKCk7XG4gICAgdGhpcy5fcmVmbG93KCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBJbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLmludGVyY2hhbmdlJywgRm91bmRhdGlvbi51dGlsLnRocm90dGxlKCgpID0+IHtcbiAgICAgIHRoaXMuX3JlZmxvdygpO1xuICAgIH0sIDUwKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgSW50ZXJjaGFuZ2UgdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlZmxvdygpIHtcbiAgICB2YXIgbWF0Y2g7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlLCBidXQgb25seSBzYXZlIHRoZSBsYXN0IG1hdGNoXG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBpZih0aGlzLnJ1bGVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBydWxlID0gdGhpcy5ydWxlc1tpXTtcbiAgICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHJ1bGUucXVlcnkpLm1hdGNoZXMpIHtcbiAgICAgICAgICBtYXRjaCA9IHJ1bGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHRoaXMucmVwbGFjZShtYXRjaC5wYXRoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgRm91bmRhdGlvbiBicmVha3BvaW50cyBhbmQgYWRkcyB0aGVtIHRvIHRoZSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgb2JqZWN0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCcmVha3BvaW50cygpIHtcbiAgICBmb3IgKHZhciBpIGluIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LnF1ZXJpZXNbaV07XG4gICAgICAgIEludGVyY2hhbmdlLlNQRUNJQUxfUVVFUklFU1txdWVyeS5uYW1lXSA9IHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIEludGVyY2hhbmdlIGVsZW1lbnQgZm9yIHRoZSBwcm92aWRlZCBtZWRpYSBxdWVyeSArIGNvbnRlbnQgcGFpcmluZ3NcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0aGF0IGlzIGFuIEludGVyY2hhbmdlIGluc3RhbmNlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gc2NlbmFyaW9zIC0gQXJyYXkgb2Ygb2JqZWN0cyB0aGF0IGhhdmUgJ21xJyBhbmQgJ3BhdGgnIGtleXMgd2l0aCBjb3JyZXNwb25kaW5nIGtleXNcbiAgICovXG4gIF9nZW5lcmF0ZVJ1bGVzKGVsZW1lbnQpIHtcbiAgICB2YXIgcnVsZXNMaXN0ID0gW107XG4gICAgdmFyIHJ1bGVzO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ydWxlcykge1xuICAgICAgcnVsZXMgPSB0aGlzLm9wdGlvbnMucnVsZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2ludGVyY2hhbmdlJyk7XG4gICAgfVxuICAgIFxuICAgIHJ1bGVzID0gIHR5cGVvZiBydWxlcyA9PT0gJ3N0cmluZycgPyBydWxlcy5tYXRjaCgvXFxbLio/XFxdL2cpIDogcnVsZXM7XG5cbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7XG4gICAgICBpZihydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2ldLnNsaWNlKDEsIC0xKS5zcGxpdCgnLCAnKTtcbiAgICAgICAgdmFyIHBhdGggPSBydWxlLnNsaWNlKDAsIC0xKS5qb2luKCcnKTtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gcnVsZVtydWxlLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmIChJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldKSB7XG4gICAgICAgICAgcXVlcnkgPSBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnldO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVsZXNMaXN0LnB1c2goe1xuICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBydWxlc0xpc3Q7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBgc3JjYCBwcm9wZXJ0eSBvZiBhbiBpbWFnZSwgb3IgY2hhbmdlIHRoZSBIVE1MIG9mIGEgY29udGFpbmVyLCB0byB0aGUgc3BlY2lmaWVkIHBhdGguXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAtIFBhdGggdG8gdGhlIGltYWdlIG9yIEhUTUwgcGFydGlhbC5cbiAgICogQGZpcmVzIEludGVyY2hhbmdlI3JlcGxhY2VkXG4gICAqL1xuICByZXBsYWNlKHBhdGgpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50UGF0aCA9PT0gcGF0aCkgcmV0dXJuO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdHJpZ2dlciA9ICdyZXBsYWNlZC56Zi5pbnRlcmNoYW5nZSc7XG5cbiAgICAvLyBSZXBsYWNpbmcgaW1hZ2VzXG4gICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUgPT09ICdJTUcnKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3NyYycsIHBhdGgpLm9uKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pXG4gICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjaW5nIGJhY2tncm91bmQgaW1hZ2VzXG4gICAgZWxzZSBpZiAocGF0aC5tYXRjaCgvXFwuKGdpZnxqcGd8anBlZ3xwbmd8c3ZnfHRpZmYpKFs/I10uKik/L2kpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7ICdiYWNrZ3JvdW5kLWltYWdlJzogJ3VybCgnK3BhdGgrJyknIH0pXG4gICAgICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBIVE1MXG4gICAgZWxzZSB7XG4gICAgICAkLmdldChwYXRoLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5odG1sKHJlc3BvbnNlKVxuICAgICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgICAgICAkKHJlc3BvbnNlKS5mb3VuZGF0aW9uKCk7XG4gICAgICAgIF90aGlzLmN1cnJlbnRQYXRoID0gcGF0aDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gY29udGVudCBpbiBhbiBJbnRlcmNoYW5nZSBlbGVtZW50IGlzIGRvbmUgYmVpbmcgbG9hZGVkLlxuICAgICAqIEBldmVudCBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgICAqL1xuICAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBpbnRlcmNoYW5nZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIC8vVE9ETyB0aGlzLlxuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkludGVyY2hhbmdlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogUnVsZXMgdG8gYmUgYXBwbGllZCB0byBJbnRlcmNoYW5nZSBlbGVtZW50cy4gU2V0IHdpdGggdGhlIGBkYXRhLWludGVyY2hhbmdlYCBhcnJheSBub3RhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7P2FycmF5fVxuICAgKiBAZGVmYXVsdCBudWxsXG4gICAqL1xuICBydWxlczogbnVsbFxufTtcblxuSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTID0ge1xuICAnbGFuZHNjYXBlJzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgJ3BvcnRyYWl0JzogJ3NjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICAncmV0aW5hJzogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksIG9ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksIG9ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihJbnRlcmNoYW5nZSwgJ0ludGVyY2hhbmdlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNYWdlbGxhbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubWFnZWxsYW5cbiAqL1xuXG5jbGFzcyBNYWdlbGxhbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIE1hZ2VsbGFuLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIE1hZ2VsbGFuI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgTWFnZWxsYW4uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLmNhbGNQb2ludHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ01hZ2VsbGFuJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2VsbGFuIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnbWFnZWxsYW4nKTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJHRhcmdldHMgPSAkKCdbZGF0YS1tYWdlbGxhbi10YXJnZXRdJyk7XG4gICAgdGhpcy4kbGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ2RhdGEtcmVzaXplJzogaWQsXG4gICAgICAnZGF0YS1zY3JvbGwnOiBpZCxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG4gICAgdGhpcy4kYWN0aXZlID0gJCgpO1xuICAgIHRoaXMuc2Nyb2xsUG9zID0gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0LCAxMCk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIGFuIGFycmF5IG9mIHBpeGVsIHZhbHVlcyB0aGF0IGFyZSB0aGUgZGVtYXJjYXRpb24gbGluZXMgYmV0d2VlbiBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gICAqIENhbiBiZSBpbnZva2VkIGlmIG5ldyBlbGVtZW50cyBhcmUgYWRkZWQgb3IgdGhlIHNpemUgb2YgYSBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGNhbGNQb2ludHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgYm9keSA9IGRvY3VtZW50LmJvZHksXG4gICAgICAgIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIHRoaXMud2luSGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLm1heCh3aW5kb3cuaW5uZXJIZWlnaHQsIGh0bWwuY2xpZW50SGVpZ2h0KSk7XG4gICAgdGhpcy5kb2NIZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KGJvZHkuc2Nyb2xsSGVpZ2h0LCBib2R5Lm9mZnNldEhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQsIGh0bWwuc2Nyb2xsSGVpZ2h0LCBodG1sLm9mZnNldEhlaWdodCkpO1xuXG4gICAgdGhpcy4kdGFyZ2V0cy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJHRhciA9ICQodGhpcyksXG4gICAgICAgICAgcHQgPSBNYXRoLnJvdW5kKCR0YXIub2Zmc2V0KCkudG9wIC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQpO1xuICAgICAgJHRhci50YXJnZXRQb2ludCA9IHB0O1xuICAgICAgX3RoaXMucG9pbnRzLnB1c2gocHQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgTWFnZWxsYW4uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgICRib2R5ID0gJCgnaHRtbCwgYm9keScpLFxuICAgICAgICBvcHRzID0ge1xuICAgICAgICAgIGR1cmF0aW9uOiBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgICAgIGVhc2luZzogICBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZ1xuICAgICAgICB9O1xuICAgICQod2luZG93KS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpe1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICAgIGlmKGxvY2F0aW9uLmhhc2gpe1xuICAgICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKGxvY2F0aW9uLmhhc2gpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfdGhpcy5jYWxjUG9pbnRzKCk7XG4gICAgICBfdGhpcy5fdXBkYXRlQWN0aXZlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5yZWZsb3cuYmluZCh0aGlzKSxcbiAgICAgICdzY3JvbGxtZS56Zi50cmlnZ2VyJzogdGhpcy5fdXBkYXRlQWN0aXZlLmJpbmQodGhpcylcbiAgICB9KS5vbignY2xpY2suemYubWFnZWxsYW4nLCAnYVtocmVmXj1cIiNcIl0nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGFycml2YWwgICA9IHRoaXMuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgICAgIF90aGlzLnNjcm9sbFRvTG9jKGFycml2YWwpO1xuICAgICAgfSk7XG4gICAgJCh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuZGVlcExpbmtpbmcpIHtcbiAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2Mod2luZG93LmxvY2F0aW9uLmhhc2gpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRvIHNjcm9sbCB0byBhIGdpdmVuIGxvY2F0aW9uIG9uIHRoZSBwYWdlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jIC0gYSBwcm9wZXJseSBmb3JtYXR0ZWQgalF1ZXJ5IGlkIHNlbGVjdG9yLiBFeGFtcGxlOiAnI2ZvbydcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzY3JvbGxUb0xvYyhsb2MpIHtcbiAgICAvLyBEbyBub3RoaW5nIGlmIHRhcmdldCBkb2VzIG5vdCBleGlzdCB0byBwcmV2ZW50IGVycm9yc1xuICAgIGlmICghJChsb2MpLmxlbmd0aCkge3JldHVybiBmYWxzZTt9XG4gICAgdGhpcy5faW5UcmFuc2l0aW9uID0gdHJ1ZTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzY3JvbGxQb3MgPSBNYXRoLnJvdW5kKCQobG9jKS5vZmZzZXQoKS50b3AgLSB0aGlzLm9wdGlvbnMudGhyZXNob2xkIC8gMiAtIHRoaXMub3B0aW9ucy5iYXJPZmZzZXQpO1xuXG4gICAgJCgnaHRtbCwgYm9keScpLnN0b3AodHJ1ZSkuYW5pbWF0ZShcbiAgICAgIHsgc2Nyb2xsVG9wOiBzY3JvbGxQb3MgfSxcbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbixcbiAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmcsXG4gICAgICBmdW5jdGlvbigpIHtfdGhpcy5faW5UcmFuc2l0aW9uID0gZmFsc2U7IF90aGlzLl91cGRhdGVBY3RpdmUoKX1cbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIE1hZ2VsbGFuIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJlZmxvdygpIHtcbiAgICB0aGlzLmNhbGNQb2ludHMoKTtcbiAgICB0aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSB2aXNpYmlsaXR5IG9mIGFuIGFjdGl2ZSBsb2NhdGlvbiBsaW5rLCBhbmQgdXBkYXRlcyB0aGUgdXJsIGhhc2ggZm9yIHRoZSBwYWdlLCBpZiBkZWVwTGlua2luZyBlbmFibGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIE1hZ2VsbGFuI3VwZGF0ZVxuICAgKi9cbiAgX3VwZGF0ZUFjdGl2ZSgvKmV2dCwgZWxlbSwgc2Nyb2xsUG9zKi8pIHtcbiAgICBpZih0aGlzLl9pblRyYW5zaXRpb24pIHtyZXR1cm47fVxuICAgIHZhciB3aW5Qb3MgPSAvKnNjcm9sbFBvcyB8fCovIHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCwgMTApLFxuICAgICAgICBjdXJJZHg7XG5cbiAgICBpZih3aW5Qb3MgKyB0aGlzLndpbkhlaWdodCA9PT0gdGhpcy5kb2NIZWlnaHQpeyBjdXJJZHggPSB0aGlzLnBvaW50cy5sZW5ndGggLSAxOyB9XG4gICAgZWxzZSBpZih3aW5Qb3MgPCB0aGlzLnBvaW50c1swXSl7IGN1cklkeCA9IHVuZGVmaW5lZDsgfVxuICAgIGVsc2V7XG4gICAgICB2YXIgaXNEb3duID0gdGhpcy5zY3JvbGxQb3MgPCB3aW5Qb3MsXG4gICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIGN1clZpc2libGUgPSB0aGlzLnBvaW50cy5maWx0ZXIoZnVuY3Rpb24ocCwgaSl7XG4gICAgICAgICAgICByZXR1cm4gaXNEb3duID8gcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IDw9IHdpblBvcyA6IHAgLSBfdGhpcy5vcHRpb25zLmJhck9mZnNldCAtIF90aGlzLm9wdGlvbnMudGhyZXNob2xkIDw9IHdpblBvcztcbiAgICAgICAgICB9KTtcbiAgICAgIGN1cklkeCA9IGN1clZpc2libGUubGVuZ3RoID8gY3VyVmlzaWJsZS5sZW5ndGggLSAxIDogMDtcbiAgICB9XG5cbiAgICB0aGlzLiRhY3RpdmUucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcbiAgICB0aGlzLiRhY3RpdmUgPSB0aGlzLiRsaW5rcy5maWx0ZXIoJ1tocmVmPVwiIycgKyB0aGlzLiR0YXJnZXRzLmVxKGN1cklkeCkuZGF0YSgnbWFnZWxsYW4tdGFyZ2V0JykgKyAnXCJdJykuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IFwiXCI7XG4gICAgICBpZihjdXJJZHggIT0gdW5kZWZpbmVkKXtcbiAgICAgICAgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIH1cbiAgICAgIGlmKGhhc2ggIT09IHdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgIGlmKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSl7XG4gICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFBvcyA9IHdpblBvcztcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIG1hZ2VsbGFuIGlzIGZpbmlzaGVkIHVwZGF0aW5nIHRvIHRoZSBuZXcgYWN0aXZlIGVsZW1lbnQuXG4gICAgICogQGV2ZW50IE1hZ2VsbGFuI3VwZGF0ZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndXBkYXRlLnpmLm1hZ2VsbGFuJywgW3RoaXMuJGFjdGl2ZV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIE1hZ2VsbGFuIGFuZCByZXNldHMgdGhlIHVybCBvZiB0aGUgd2luZG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5tYWdlbGxhbicpXG4gICAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3N9YCkucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoaGFzaCwgJycpO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5NYWdlbGxhbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgdGhlIGFuaW1hdGVkIHNjcm9sbGluZyBzaG91bGQgdGFrZSBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCA1MDBcbiAgICovXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXG4gIC8qKlxuICAgKiBBbmltYXRpb24gc3R5bGUgdG8gdXNlIHdoZW4gc2Nyb2xsaW5nIGJldHdlZW4gbG9jYXRpb25zLiBDYW4gYmUgYCdzd2luZydgIG9yIGAnbGluZWFyJ2AuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2xpbmVhcidcbiAgICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9hcGkuanF1ZXJ5LmNvbS9hbmltYXRlfEpxdWVyeSBhbmltYXRlfVxuICAgKi9cbiAgYW5pbWF0aW9uRWFzaW5nOiAnbGluZWFyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gdXNlIGFzIGEgbWFya2VyIGZvciBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDUwXG4gICAqL1xuICB0aHJlc2hvbGQ6IDUwLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGxvY2F0aW9ucyBsaW5rIG9uIHRoZSBtYWdlbGxhbiBjb250YWluZXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2FjdGl2ZSdcbiAgICovXG4gIGFjdGl2ZUNsYXNzOiAnYWN0aXZlJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgc2NyaXB0IHRvIG1hbmlwdWxhdGUgdGhlIHVybCBvZiB0aGUgY3VycmVudCBwYWdlLCBhbmQgaWYgc3VwcG9ydGVkLCBhbHRlciB0aGUgaGlzdG9yeS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5raW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gb2Zmc2V0IHRoZSBzY3JvbGwgb2YgdGhlIHBhZ2Ugb24gaXRlbSBjbGljayBpZiB1c2luZyBhIHN0aWNreSBuYXYgYmFyLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIGJhck9mZnNldDogMFxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oTWFnZWxsYW4sICdNYWdlbGxhbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT2ZmQ2FudmFzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vZmZjYW52YXNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqL1xuXG5jbGFzcyBPZmZDYW52YXMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvZmYtY2FudmFzIHdyYXBwZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGluaXRpYWxpemUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT2ZmQ2FudmFzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy4kbGFzdFRyaWdnZXIgPSAkKCk7XG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKCk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPZmZDYW52YXMnKVxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09mZkNhbnZhcycsIHtcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnXG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGJ5IGFkZGluZyB0aGUgZXhpdCBvdmVybGF5IChpZiBuZWVkZWQpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyhgaXMtdHJhbnNpdGlvbi0ke3RoaXMub3B0aW9ucy50cmFuc2l0aW9ufWApO1xuXG4gICAgLy8gRmluZCB0cmlnZ2VycyB0aGF0IGFmZmVjdCB0aGlzIGVsZW1lbnQgYW5kIGFkZCBhcmlhLWV4cGFuZGVkIHRvIHRoZW1cbiAgICB0aGlzLiR0cmlnZ2VycyA9ICQoZG9jdW1lbnQpXG4gICAgICAuZmluZCgnW2RhdGEtb3Blbj1cIicraWQrJ1wiXSwgW2RhdGEtY2xvc2U9XCInK2lkKydcIl0sIFtkYXRhLXRvZ2dsZT1cIicraWQrJ1wiXScpXG4gICAgICAuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpXG4gICAgICAuYXR0cignYXJpYS1jb250cm9scycsIGlkKTtcblxuICAgIC8vIEFkZCBhbiBvdmVybGF5IG92ZXIgdGhlIGNvbnRlbnQgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50T3ZlcmxheSA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHZhciBvdmVybGF5UG9zaXRpb24gPSAkKHRoaXMuJGVsZW1lbnQpLmNzcyhcInBvc2l0aW9uXCIpID09PSAnZml4ZWQnID8gJ2lzLW92ZXJsYXktZml4ZWQnIDogJ2lzLW92ZXJsYXktYWJzb2x1dGUnO1xuICAgICAgb3ZlcmxheS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2pzLW9mZi1jYW52YXMtb3ZlcmxheSAnICsgb3ZlcmxheVBvc2l0aW9uKTtcbiAgICAgIHRoaXMuJG92ZXJsYXkgPSAkKG92ZXJsYXkpO1xuICAgICAgaWYob3ZlcmxheVBvc2l0aW9uID09PSAnaXMtb3ZlcmxheS1maXhlZCcpIHtcbiAgICAgICAgJCgnYm9keScpLmFwcGVuZCh0aGlzLiRvdmVybGF5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQuc2libGluZ3MoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hcHBlbmQodGhpcy4kb3ZlcmxheSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLmlzUmV2ZWFsZWQgPSB0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCB8fCBuZXcgUmVnRXhwKHRoaXMub3B0aW9ucy5yZXZlYWxDbGFzcywgJ2cnKS50ZXN0KHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5vcHRpb25zLnJldmVhbE9uID0gdGhpcy5vcHRpb25zLnJldmVhbE9uIHx8IHRoaXMuJGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC8ocmV2ZWFsLWZvci1tZWRpdW18cmV2ZWFsLWZvci1sYXJnZSkvZylbMF0uc3BsaXQoJy0nKVsyXTtcbiAgICAgIHRoaXMuX3NldE1RQ2hlY2tlcigpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy50cmFuc2l0aW9uVGltZSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lID0gcGFyc2VGbG9hdCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkKCdbZGF0YS1vZmYtY2FudmFzXScpWzBdKS50cmFuc2l0aW9uRHVyYXRpb24pICogMTAwMDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGFuZCB0aGUgZXhpdCBvdmVybGF5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKS5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuY2xvc2UuYmluZCh0aGlzKSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAna2V5ZG93bi56Zi5vZmZjYW52YXMnOiB0aGlzLl9oYW5kbGVLZXlib2FyZC5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayA9PT0gdHJ1ZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSB0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPyB0aGlzLiRvdmVybGF5IDogJCgnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpO1xuICAgICAgJHRhcmdldC5vbih7J2NsaWNrLnpmLm9mZmNhbnZhcyc6IHRoaXMuY2xvc2UuYmluZCh0aGlzKX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGV2ZW50IGxpc3RlbmVyIGZvciBlbGVtZW50cyB0aGF0IHdpbGwgcmV2ZWFsIGF0IGNlcnRhaW4gYnJlYWtwb2ludHMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0TVFDaGVja2VyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XG4gICAgICAgIF90aGlzLnJldmVhbCh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF90aGlzLnJldmVhbChmYWxzZSk7XG4gICAgICB9XG4gICAgfSkub25lKCdsb2FkLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KF90aGlzLm9wdGlvbnMucmV2ZWFsT24pKSB7XG4gICAgICAgIF90aGlzLnJldmVhbCh0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSByZXZlYWxpbmcvaGlkaW5nIHRoZSBvZmYtY2FudmFzIGF0IGJyZWFrcG9pbnRzLCBub3QgdGhlIHNhbWUgYXMgb3Blbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBpc1JldmVhbGVkIC0gdHJ1ZSBpZiBlbGVtZW50IHNob3VsZCBiZSByZXZlYWxlZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICByZXZlYWwoaXNSZXZlYWxlZCkge1xuICAgIHZhciAkY2xvc2VyID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKTtcbiAgICBpZiAoaXNSZXZlYWxlZCkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgdGhpcy5pc1JldmVhbGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdvcGVuLnpmLnRyaWdnZXIgdG9nZ2xlLnpmLnRyaWdnZXInKTtcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkgeyAkY2xvc2VyLmhpZGUoKTsgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKVxuICAgICAgfSk7XG4gICAgICBpZiAoJGNsb3Nlci5sZW5ndGgpIHtcbiAgICAgICAgJGNsb3Nlci5zaG93KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN0b3BzIHNjcm9sbGluZyBvZiB0aGUgYm9keSB3aGVuIG9mZmNhbnZhcyBpcyBvcGVuIG9uIG1vYmlsZSBTYWZhcmkgYW5kIG90aGVyIHRyb3VibGVzb21lIGJyb3dzZXJzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3N0b3BTY3JvbGxpbmcoZXZlbnQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBUYWtlbiBhbmQgYWRhcHRlZCBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTY4ODk0NDcvcHJldmVudC1mdWxsLXBhZ2Utc2Nyb2xsaW5nLWlvc1xuICAvLyBPbmx5IHJlYWxseSB3b3JrcyBmb3IgeSwgbm90IHN1cmUgaG93IHRvIGV4dGVuZCB0byB4IG9yIGlmIHdlIG5lZWQgdG8uXG4gIF9yZWNvcmRTY3JvbGxhYmxlKGV2ZW50KSB7XG4gICAgbGV0IGVsZW0gPSB0aGlzOyAvLyBjYWxsZWQgZnJvbSBldmVudCBoYW5kbGVyIGNvbnRleHQgd2l0aCB0aGlzIGFzIGVsZW1cblxuICAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyBzY3JvbGxhYmxlIChjb250ZW50IG92ZXJmbG93cyksIHRoZW4uLi5cbiAgICBpZiAoZWxlbS5zY3JvbGxIZWlnaHQgIT09IGVsZW0uY2xpZW50SGVpZ2h0KSB7XG4gICAgICAvLyBJZiB3ZSdyZSBhdCB0aGUgdG9wLCBzY3JvbGwgZG93biBvbmUgcGl4ZWwgdG8gYWxsb3cgc2Nyb2xsaW5nIHVwXG4gICAgICBpZiAoZWxlbS5zY3JvbGxUb3AgPT09IDApIHtcbiAgICAgICAgZWxlbS5zY3JvbGxUb3AgPSAxO1xuICAgICAgfVxuICAgICAgLy8gSWYgd2UncmUgYXQgdGhlIGJvdHRvbSwgc2Nyb2xsIHVwIG9uZSBwaXhlbCB0byBhbGxvdyBzY3JvbGxpbmcgZG93blxuICAgICAgaWYgKGVsZW0uc2Nyb2xsVG9wID09PSBlbGVtLnNjcm9sbEhlaWdodCAtIGVsZW0uY2xpZW50SGVpZ2h0KSB7XG4gICAgICAgIGVsZW0uc2Nyb2xsVG9wID0gZWxlbS5zY3JvbGxIZWlnaHQgLSBlbGVtLmNsaWVudEhlaWdodCAtIDE7XG4gICAgICB9XG4gICAgfVxuICAgIGVsZW0uYWxsb3dVcCA9IGVsZW0uc2Nyb2xsVG9wID4gMDtcbiAgICBlbGVtLmFsbG93RG93biA9IGVsZW0uc2Nyb2xsVG9wIDwgKGVsZW0uc2Nyb2xsSGVpZ2h0IC0gZWxlbS5jbGllbnRIZWlnaHQpO1xuICAgIGVsZW0ubGFzdFkgPSBldmVudC5vcmlnaW5hbEV2ZW50LnBhZ2VZO1xuICB9XG5cbiAgX3N0b3BTY3JvbGxQcm9wYWdhdGlvbihldmVudCkge1xuICAgIGxldCBlbGVtID0gdGhpczsgLy8gY2FsbGVkIGZyb20gZXZlbnQgaGFuZGxlciBjb250ZXh0IHdpdGggdGhpcyBhcyBlbGVtXG4gICAgbGV0IHVwID0gZXZlbnQucGFnZVkgPCBlbGVtLmxhc3RZO1xuICAgIGxldCBkb3duID0gIXVwO1xuICAgIGVsZW0ubGFzdFkgPSBldmVudC5wYWdlWTtcblxuICAgIGlmKCh1cCAmJiBlbGVtLmFsbG93VXApIHx8IChkb3duICYmIGVsZW0uYWxsb3dEb3duKSkge1xuICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBvZmYtY2FudmFzIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgLSBFdmVudCBvYmplY3QgcGFzc2VkIGZyb20gbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSB0cmlnZ2VyIC0gZWxlbWVudCB0aGF0IHRyaWdnZXJlZCB0aGUgb2ZmLWNhbnZhcyB0byBvcGVuLlxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI29wZW5lZFxuICAgKi9cbiAgb3BlbihldmVudCwgdHJpZ2dlcikge1xuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykgfHwgdGhpcy5pc1JldmVhbGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodHJpZ2dlcikge1xuICAgICAgdGhpcy4kbGFzdFRyaWdnZXIgPSB0cmlnZ2VyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZm9yY2VUbyA9PT0gJ3RvcCcpIHtcbiAgICAgIHdpbmRvdy5zY3JvbGxUbygwLCAwKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5mb3JjZVRvID09PSAnYm90dG9tJykge1xuICAgICAgd2luZG93LnNjcm9sbFRvKDAsZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cbiAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI29wZW5lZFxuICAgICAqL1xuICAgIF90aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy1vcGVuJylcblxuICAgIHRoaXMuJHRyaWdnZXJzLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAndHJ1ZScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKVxuICAgICAgICAudHJpZ2dlcignb3BlbmVkLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgLy8gSWYgYGNvbnRlbnRTY3JvbGxgIGlzIHNldCB0byBmYWxzZSwgYWRkIGNsYXNzIGFuZCBkaXNhYmxlIHNjcm9sbGluZyBvbiB0b3VjaCBkZXZpY2VzLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudFNjcm9sbCA9PT0gZmFsc2UpIHtcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygnaXMtb2ZmLWNhbnZhcy1vcGVuJykub24oJ3RvdWNobW92ZScsIHRoaXMuX3N0b3BTY3JvbGxpbmcpO1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigndG91Y2hzdGFydCcsIHRoaXMuX3JlY29yZFNjcm9sbGFibGUpO1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigndG91Y2htb3ZlJywgdGhpcy5fc3RvcFNjcm9sbFByb3BhZ2F0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgPT09IHRydWUgJiYgdGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpcy1jbG9zYWJsZScpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQodGhpcy4kZWxlbWVudCksIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5maW5kKCdhLCBidXR0b24nKS5lcSgwKS5mb2N1cygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2libGluZ3MoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hdHRyKCd0YWJpbmRleCcsICctMScpO1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYiB0byBmaXJlIGFmdGVyIGNsb3N1cmUuXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjY2xvc2VkXG4gICAqL1xuICBjbG9zZShjYikge1xuICAgIGlmICghdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpIHx8IHRoaXMuaXNSZXZlYWxlZCkgeyByZXR1cm47IH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJylcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW5zLlxuICAgICAgICogQGV2ZW50IE9mZkNhbnZhcyNjbG9zZWRcbiAgICAgICAqL1xuICAgICAgICAudHJpZ2dlcignY2xvc2VkLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgLy8gSWYgYGNvbnRlbnRTY3JvbGxgIGlzIHNldCB0byBmYWxzZSwgcmVtb3ZlIGNsYXNzIGFuZCByZS1lbmFibGUgc2Nyb2xsaW5nIG9uIHRvdWNoIGRldmljZXMuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50U2Nyb2xsID09PSBmYWxzZSkge1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdpcy1vZmYtY2FudmFzLW9wZW4nKS5vZmYoJ3RvdWNobW92ZScsIHRoaXMuX3N0b3BTY3JvbGxpbmcpO1xuICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ3RvdWNoc3RhcnQnLCB0aGlzLl9yZWNvcmRTY3JvbGxhYmxlKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCd0b3VjaG1vdmUnLCB0aGlzLl9zdG9wU2Nyb2xsUHJvcGFnYXRpb24pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkucmVtb3ZlQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayA9PT0gdHJ1ZSAmJiB0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkucmVtb3ZlQ2xhc3MoJ2lzLWNsb3NhYmxlJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2libGluZ3MoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5yZW1vdmVBdHRyKCd0YWJpbmRleCcpO1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWxlYXNlRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9mZi1jYW52YXMgbWVudSBvcGVuIG9yIGNsb3NlZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCAtIEV2ZW50IG9iamVjdCBwYXNzZWQgZnJvbSBsaXN0ZW5lci5cbiAgICogQHBhcmFtIHtqUXVlcnl9IHRyaWdnZXIgLSBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBvZmYtY2FudmFzIHRvIG9wZW4uXG4gICAqL1xuICB0b2dnbGUoZXZlbnQsIHRyaWdnZXIpIHtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKSB7XG4gICAgICB0aGlzLmNsb3NlKGV2ZW50LCB0cmlnZ2VyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLm9wZW4oZXZlbnQsIHRyaWdnZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGtleWJvYXJkIGlucHV0IHdoZW4gZGV0ZWN0ZWQuIFdoZW4gdGhlIGVzY2FwZSBrZXkgaXMgcHJlc3NlZCwgdGhlIG9mZi1jYW52YXMgbWVudSBjbG9zZXMsIGFuZCBmb2N1cyBpcyByZXN0b3JlZCB0byB0aGUgZWxlbWVudCB0aGF0IG9wZW5lZCB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlS2V5Ym9hcmQoZSkge1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdPZmZDYW52YXMnLCB7XG4gICAgICBjbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIHRoaXMuJGxhc3RUcmlnZ2VyLmZvY3VzKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIGhhbmRsZWQ6ICgpID0+IHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBvZmZjYW52YXMgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJyk7XG4gICAgdGhpcy4kb3ZlcmxheS5vZmYoJy56Zi5vZmZjYW52YXMnKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5PZmZDYW52YXMuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgdXNlciB0byBjbGljayBvdXRzaWRlIG9mIHRoZSBtZW51IHRvIGNsb3NlIGl0LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gb3ZlcmxheSBvbiB0b3Agb2YgYFtkYXRhLW9mZi1jYW52YXMtY29udGVudF1gLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjb250ZW50T3ZlcmxheTogdHJ1ZSxcblxuICAvKipcbiAgICogRW5hYmxlL2Rpc2FibGUgc2Nyb2xsaW5nIG9mIHRoZSBtYWluIGNvbnRlbnQgd2hlbiBhbiBvZmYgY2FudmFzIHBhbmVsIGlzIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGNvbnRlbnRTY3JvbGw6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIGluIG1zIHRoZSBvcGVuIGFuZCBjbG9zZSB0cmFuc2l0aW9uIHJlcXVpcmVzLiBJZiBub25lIHNlbGVjdGVkLCBwdWxscyBmcm9tIGJvZHkgc3R5bGUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMFxuICAgKi9cbiAgdHJhbnNpdGlvblRpbWU6IDAsXG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgdHJhbnNpdGlvbiBmb3IgdGhlIG9mZmNhbnZhcyBtZW51LiBPcHRpb25zIGFyZSAncHVzaCcsICdkZXRhY2hlZCcgb3IgJ3NsaWRlJy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCBwdXNoXG4gICAqL1xuICB0cmFuc2l0aW9uOiAncHVzaCcsXG5cbiAgLyoqXG4gICAqIEZvcmNlIHRoZSBwYWdlIHRvIHNjcm9sbCB0byB0b3Agb3IgYm90dG9tIG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUgez9zdHJpbmd9XG4gICAqIEBkZWZhdWx0IG51bGxcbiAgICovXG4gIGZvcmNlVG86IG51bGwsXG5cbiAgLyoqXG4gICAqIEFsbG93IHRoZSBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4gZm9yIGNlcnRhaW4gYnJlYWtwb2ludHMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBpc1JldmVhbGVkOiBmYWxzZSxcblxuICAvKipcbiAgICogQnJlYWtwb2ludCBhdCB3aGljaCB0byByZXZlYWwuIEpTIHdpbGwgdXNlIGEgUmVnRXhwIHRvIHRhcmdldCBzdGFuZGFyZCBjbGFzc2VzLCBpZiBjaGFuZ2luZyBjbGFzc25hbWVzLCBwYXNzIHlvdXIgY2xhc3Mgd2l0aCB0aGUgYHJldmVhbENsYXNzYCBvcHRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUgez9zdHJpbmd9XG4gICAqIEBkZWZhdWx0IG51bGxcbiAgICovXG4gIHJldmVhbE9uOiBudWxsLFxuXG4gIC8qKlxuICAgKiBGb3JjZSBmb2N1cyB0byB0aGUgb2ZmY2FudmFzIG9uIG9wZW4uIElmIHRydWUsIHdpbGwgZm9jdXMgdGhlIG9wZW5pbmcgdHJpZ2dlciBvbiBjbG9zZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB1c2VkIHRvIGZvcmNlIGFuIG9mZmNhbnZhcyB0byByZW1haW4gb3Blbi4gRm91bmRhdGlvbiBkZWZhdWx0cyBmb3IgdGhpcyBhcmUgYHJldmVhbC1mb3ItbGFyZ2VgICYgYHJldmVhbC1mb3ItbWVkaXVtYC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCByZXZlYWwtZm9yLVxuICAgKiBAdG9kbyBpbXByb3ZlIHRoZSByZWdleCB0ZXN0aW5nIGZvciB0aGlzLlxuICAgKi9cbiAgcmV2ZWFsQ2xhc3M6ICdyZXZlYWwtZm9yLScsXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIG9wdGlvbmFsIGZvY3VzIHRyYXBwaW5nIHdoZW4gb3BlbmluZyBhbiBvZmZjYW52YXMuIFNldHMgdGFiaW5kZXggb2YgW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XSB0byAtMSBmb3IgYWNjZXNzaWJpbGl0eSBwdXJwb3Nlcy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHRyYXBGb2N1czogZmFsc2Vcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE9mZkNhbnZhcywgJ09mZkNhbnZhcycpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT3JiaXQgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm9yYml0XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRvdWNoXG4gKi9cblxuY2xhc3MgT3JiaXQge1xuICAvKipcbiAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIG9yYml0IGNhcm91c2VsLlxuICAqIEBjbGFzc1xuICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gT3JiaXQgQ2Fyb3VzZWwuXG4gICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKXtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT3JiaXQuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ09yYml0Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignT3JiaXQnLCB7XG4gICAgICAnbHRyJzoge1xuICAgICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAgICdBUlJPV19MRUZUJzogJ3ByZXZpb3VzJ1xuICAgICAgfSxcbiAgICAgICdydGwnOiB7XG4gICAgICAgICdBUlJPV19MRUZUJzogJ25leHQnLFxuICAgICAgICAnQVJST1dfUklHSFQnOiAncHJldmlvdXMnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBJbml0aWFsaXplcyB0aGUgcGx1Z2luIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucywgc2V0dGluZyBhdHRyaWJ1dGVzLCBhbmQgc3RhcnRpbmcgdGhlIGFuaW1hdGlvbi5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfaW5pdCgpIHtcbiAgICAvLyBAVE9ETzogY29uc2lkZXIgZGlzY3Vzc2lvbiBvbiBQUiAjOTI3OCBhYm91dCBET00gcG9sbHV0aW9uIGJ5IGNoYW5nZVNsaWRlXG4gICAgdGhpcy5fcmVzZXQoKTtcblxuICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5jb250YWluZXJDbGFzc31gKTtcbiAgICB0aGlzLiRzbGlkZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApO1xuXG4gICAgdmFyICRpbWFnZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2ltZycpLFxuICAgICAgICBpbml0QWN0aXZlID0gdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpLFxuICAgICAgICBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnb3JiaXQnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnZGF0YS1yZXNpemUnOiBpZCxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG5cbiAgICBpZiAoIWluaXRBY3RpdmUubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRzbGlkZXMuZXEoMCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZU1VSSkge1xuICAgICAgdGhpcy4kc2xpZGVzLmFkZENsYXNzKCduby1tb3Rpb251aScpO1xuICAgIH1cblxuICAgIGlmICgkaW1hZ2VzLmxlbmd0aCkge1xuICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCgkaW1hZ2VzLCB0aGlzLl9wcmVwYXJlRm9yT3JiaXQuYmluZCh0aGlzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3ByZXBhcmVGb3JPcmJpdCgpOy8vaGVoZVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgdGhpcy5fbG9hZEJ1bGxldHMoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkgJiYgdGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMuZ2VvU3luYygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzaWJsZSkgeyAvLyBhbGxvdyB3cmFwcGVyIHRvIGJlIGZvY3VzYWJsZSB0byBlbmFibGUgYXJyb3cgbmF2aWdhdGlvblxuICAgICAgdGhpcy4kd3JhcHBlci5hdHRyKCd0YWJpbmRleCcsIDApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENyZWF0ZXMgYSBqUXVlcnkgY29sbGVjdGlvbiBvZiBidWxsZXRzLCBpZiB0aGV5IGFyZSBiZWluZyB1c2VkLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9sb2FkQnVsbGV0cygpIHtcbiAgICB0aGlzLiRidWxsZXRzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYm94T2ZCdWxsZXRzfWApLmZpbmQoJ2J1dHRvbicpO1xuICB9XG5cbiAgLyoqXG4gICogU2V0cyBhIGB0aW1lcmAgb2JqZWN0IG9uIHRoZSBvcmJpdCwgYW5kIHN0YXJ0cyB0aGUgY291bnRlciBmb3IgdGhlIG5leHQgc2xpZGUuXG4gICogQGZ1bmN0aW9uXG4gICovXG4gIGdlb1N5bmMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRpbWVyID0gbmV3IEZvdW5kYXRpb24uVGltZXIoXG4gICAgICB0aGlzLiRlbGVtZW50LFxuICAgICAge1xuICAgICAgICBkdXJhdGlvbjogdGhpcy5vcHRpb25zLnRpbWVyRGVsYXksXG4gICAgICAgIGluZmluaXRlOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgIH0pO1xuICAgIHRoaXMudGltZXIuc3RhcnQoKTtcbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgd3JhcHBlciBhbmQgc2xpZGUgaGVpZ2h0cyBmb3IgdGhlIG9yYml0LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9wcmVwYXJlRm9yT3JiaXQoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl9zZXRXcmFwcGVySGVpZ2h0KCk7XG4gIH1cblxuICAvKipcbiAgKiBDYWx1bGF0ZXMgdGhlIGhlaWdodCBvZiBlYWNoIHNsaWRlIGluIHRoZSBjb2xsZWN0aW9uLCBhbmQgdXNlcyB0aGUgdGFsbGVzdCBvbmUgZm9yIHRoZSB3cmFwcGVyIGhlaWdodC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gYSBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIHdoZW4gY29tcGxldGUuXG4gICovXG4gIF9zZXRXcmFwcGVySGVpZ2h0KGNiKSB7Ly9yZXdyaXRlIHRoaXMgdG8gYGZvcmAgbG9vcFxuICAgIHZhciBtYXggPSAwLCB0ZW1wLCBjb3VudGVyID0gMCwgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB0ZW1wID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICAkKHRoaXMpLmF0dHIoJ2RhdGEtc2xpZGUnLCBjb3VudGVyKTtcblxuICAgICAgaWYgKF90aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJylbMF0gIT09IF90aGlzLiRzbGlkZXMuZXEoY291bnRlcilbMF0pIHsvL2lmIG5vdCB0aGUgYWN0aXZlIHNsaWRlLCBzZXQgY3NzIHBvc2l0aW9uIGFuZCBkaXNwbGF5IHByb3BlcnR5XG4gICAgICAgICQodGhpcykuY3NzKHsncG9zaXRpb24nOiAncmVsYXRpdmUnLCAnZGlzcGxheSc6ICdub25lJ30pO1xuICAgICAgfVxuICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XG4gICAgICBjb3VudGVyKys7XG4gICAgfSk7XG5cbiAgICBpZiAoY291bnRlciA9PT0gdGhpcy4kc2xpZGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy4kd3JhcHBlci5jc3MoeydoZWlnaHQnOiBtYXh9KTsgLy9vbmx5IGNoYW5nZSB0aGUgd3JhcHBlciBoZWlnaHQgcHJvcGVydHkgb25jZS5cbiAgICAgIGlmKGNiKSB7Y2IobWF4KTt9IC8vZmlyZSBjYWxsYmFjayB3aXRoIG1heCBoZWlnaHQgZGltZW5zaW9uLlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgdGhlIG1heC1oZWlnaHQgb2YgZWFjaCBzbGlkZS5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfc2V0U2xpZGVIZWlnaHQoaGVpZ2h0KSB7XG4gICAgdGhpcy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLmNzcygnbWF4LWhlaWdodCcsIGhlaWdodCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBiYXNpY2FsbHkgZXZlcnl0aGluZyB3aXRoaW4gdGhlIGVsZW1lbnQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAvLyoqTm93IHVzaW5nIGN1c3RvbSBldmVudCAtIHRoYW5rcyB0bzoqKlxuICAgIC8vKiogICAgICBZb2hhaSBBcmFyYXQgb2YgVG9yb250byAgICAgICoqXG4gICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAvL1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcucmVzaXplbWUuemYudHJpZ2dlcicpLm9uKHtcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fcHJlcGFyZUZvck9yYml0LmJpbmQodGhpcylcbiAgICB9KVxuICAgIGlmICh0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnN3aXBlKSB7XG4gICAgICAgIHRoaXMuJHNsaWRlcy5vZmYoJ3N3aXBlbGVmdC56Zi5vcmJpdCBzd2lwZXJpZ2h0LnpmLm9yYml0JylcbiAgICAgICAgLm9uKCdzd2lwZWxlZnQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICAgIH0pLm9uKCdzd2lwZXJpZ2h0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5KSB7XG4gICAgICAgIHRoaXMuJHNsaWRlcy5vbignY2xpY2suemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nLCBfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/IGZhbHNlIDogdHJ1ZSk7XG4gICAgICAgICAgX3RoaXMudGltZXJbX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykgPyAncGF1c2UnIDogJ3N0YXJ0J10oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5wYXVzZU9uSG92ZXIpIHtcbiAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWVudGVyLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy50aW1lci5wYXVzZSgpO1xuICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIV90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpKSB7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVyLnN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5uYXZCdXR0b25zKSB7XG4gICAgICAgIHZhciAkY29udHJvbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5uZXh0Q2xhc3N9LCAuJHt0aGlzLm9wdGlvbnMucHJldkNsYXNzfWApO1xuICAgICAgICAkY29udHJvbHMuYXR0cigndGFiaW5kZXgnLCAwKVxuICAgICAgICAvL2Fsc28gbmVlZCB0byBoYW5kbGUgZW50ZXIvcmV0dXJuIGFuZCBzcGFjZWJhciBrZXkgcHJlc3Nlc1xuICAgICAgICAub24oJ2NsaWNrLnpmLm9yYml0IHRvdWNoZW5kLnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG5cdCAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKCQodGhpcykuaGFzQ2xhc3MoX3RoaXMub3B0aW9ucy5uZXh0Q2xhc3MpKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYnVsbGV0cykge1xuICAgICAgICB0aGlzLiRidWxsZXRzLm9uKCdjbGljay56Zi5vcmJpdCB0b3VjaGVuZC56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgvaXMtYWN0aXZlL2cudGVzdCh0aGlzLmNsYXNzTmFtZSkpIHsgcmV0dXJuIGZhbHNlOyB9Ly9pZiB0aGlzIGlzIGFjdGl2ZSwga2ljayBvdXQgb2YgZnVuY3Rpb24uXG4gICAgICAgICAgdmFyIGlkeCA9ICQodGhpcykuZGF0YSgnc2xpZGUnKSxcbiAgICAgICAgICBsdHIgPSBpZHggPiBfdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpLmRhdGEoJ3NsaWRlJyksXG4gICAgICAgICAgJHNsaWRlID0gX3RoaXMuJHNsaWRlcy5lcShpZHgpO1xuXG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUobHRyLCAkc2xpZGUsIGlkeCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc2libGUpIHtcbiAgICAgICAgdGhpcy4kd3JhcHBlci5hZGQodGhpcy4kYnVsbGV0cykub24oJ2tleWRvd24uemYub3JiaXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdPcmJpdCcsIHtcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHsgLy8gaWYgYnVsbGV0IGlzIGZvY3VzZWQsIG1ha2Ugc3VyZSBmb2N1cyBtb3Zlc1xuICAgICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuaXMoX3RoaXMuJGJ1bGxldHMpKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuJGJ1bGxldHMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIE9yYml0IHNvIGl0IGNhbiBiZSByZWluaXRpYWxpemVkXG4gICAqL1xuICBfcmVzZXQoKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgdGhlcmUgYXJlIG5vIHNsaWRlcyAoZmlyc3QgcnVuKVxuICAgIGlmICh0eXBlb2YgdGhpcy4kc2xpZGVzID09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG4gICAgICAvLyBSZW1vdmUgb2xkIGV2ZW50c1xuICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5vcmJpdCcpLmZpbmQoJyonKS5vZmYoJy56Zi5vcmJpdCcpXG5cbiAgICAgIC8vIFJlc3RhcnQgdGltZXIgaWYgYXV0b1BsYXkgaXMgZW5hYmxlZFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSkge1xuICAgICAgICB0aGlzLnRpbWVyLnJlc3RhcnQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVzZXQgYWxsIHNsaWRkZXNcbiAgICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtYWN0aXZlIGlzLWluJylcbiAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1saXZlJylcbiAgICAgICAgICAuaGlkZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNob3cgdGhlIGZpcnN0IHNsaWRlXG4gICAgICB0aGlzLiRzbGlkZXMuZmlyc3QoKS5hZGRDbGFzcygnaXMtYWN0aXZlJykuc2hvdygpO1xuXG4gICAgICAvLyBUcmlnZ2VycyB3aGVuIHRoZSBzbGlkZSBoYXMgZmluaXNoZWQgYW5pbWF0aW5nXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3NsaWRlY2hhbmdlLnpmLm9yYml0JywgW3RoaXMuJHNsaWRlcy5maXJzdCgpXSk7XG5cbiAgICAgIC8vIFNlbGVjdCBmaXJzdCBidWxsZXQgaWYgYnVsbGV0cyBhcmUgcHJlc2VudFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUJ1bGxldHMoMCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ2hhbmdlcyB0aGUgY3VycmVudCBzbGlkZSB0byBhIG5ldyBvbmUuXG4gICogQGZ1bmN0aW9uXG4gICogQHBhcmFtIHtCb29sZWFufSBpc0xUUiAtIGZsYWcgaWYgdGhlIHNsaWRlIHNob3VsZCBtb3ZlIGxlZnQgdG8gcmlnaHQuXG4gICogQHBhcmFtIHtqUXVlcnl9IGNob3NlblNsaWRlIC0gdGhlIGpRdWVyeSBlbGVtZW50IG9mIHRoZSBzbGlkZSB0byBzaG93IG5leHQsIGlmIG9uZSBpcyBzZWxlY3RlZC5cbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBuZXcgc2xpZGUgaW4gaXRzIGNvbGxlY3Rpb24sIGlmIG9uZSBjaG9zZW4uXG4gICogQGZpcmVzIE9yYml0I3NsaWRlY2hhbmdlXG4gICovXG4gIGNoYW5nZVNsaWRlKGlzTFRSLCBjaG9zZW5TbGlkZSwgaWR4KSB7XG4gICAgaWYgKCF0aGlzLiRzbGlkZXMpIHtyZXR1cm47IH0gLy8gRG9uJ3QgZnJlYWsgb3V0IGlmIHdlJ3JlIGluIHRoZSBtaWRkbGUgb2YgY2xlYW51cFxuICAgIHZhciAkY3VyU2xpZGUgPSB0aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZXEoMCk7XG5cbiAgICBpZiAoL211aS9nLnRlc3QoJGN1clNsaWRlWzBdLmNsYXNzTmFtZSkpIHsgcmV0dXJuIGZhbHNlOyB9IC8vaWYgdGhlIHNsaWRlIGlzIGN1cnJlbnRseSBhbmltYXRpbmcsIGtpY2sgb3V0IG9mIHRoZSBmdW5jdGlvblxuXG4gICAgdmFyICRmaXJzdFNsaWRlID0gdGhpcy4kc2xpZGVzLmZpcnN0KCksXG4gICAgJGxhc3RTbGlkZSA9IHRoaXMuJHNsaWRlcy5sYXN0KCksXG4gICAgZGlySW4gPSBpc0xUUiA/ICdSaWdodCcgOiAnTGVmdCcsXG4gICAgZGlyT3V0ID0gaXNMVFIgPyAnTGVmdCcgOiAnUmlnaHQnLFxuICAgIF90aGlzID0gdGhpcyxcbiAgICAkbmV3U2xpZGU7XG5cbiAgICBpZiAoIWNob3NlblNsaWRlKSB7IC8vbW9zdCBvZiB0aGUgdGltZSwgdGhpcyB3aWxsIGJlIGF1dG8gcGxheWVkIG9yIGNsaWNrZWQgZnJvbSB0aGUgbmF2QnV0dG9ucy5cbiAgICAgICRuZXdTbGlkZSA9IGlzTFRSID8gLy9pZiB3cmFwcGluZyBlbmFibGVkLCBjaGVjayB0byBzZWUgaWYgdGhlcmUgaXMgYSBgbmV4dGAgb3IgYHByZXZgIHNpYmxpbmcsIGlmIG5vdCwgc2VsZWN0IHRoZSBmaXJzdCBvciBsYXN0IHNsaWRlIHRvIGZpbGwgaW4uIGlmIHdyYXBwaW5nIG5vdCBlbmFibGVkLCBhdHRlbXB0IHRvIHNlbGVjdCBgbmV4dGAgb3IgYHByZXZgLCBpZiB0aGVyZSdzIG5vdGhpbmcgdGhlcmUsIHRoZSBmdW5jdGlvbiB3aWxsIGtpY2sgb3V0IG9uIG5leHQgc3RlcC4gQ1JBWlkgTkVTVEVEIFRFUk5BUklFUyEhISEhXG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUubmV4dChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkZmlyc3RTbGlkZSA6ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSkvL3BpY2sgbmV4dCBzbGlkZSBpZiBtb3ZpbmcgbGVmdCB0byByaWdodFxuICAgICAgOlxuICAgICAgKHRoaXMub3B0aW9ucy5pbmZpbml0ZVdyYXAgPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkubGVuZ3RoID8gJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApIDogJGxhc3RTbGlkZSA6ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSk7Ly9waWNrIHByZXYgc2xpZGUgaWYgbW92aW5nIHJpZ2h0IHRvIGxlZnRcbiAgICB9IGVsc2Uge1xuICAgICAgJG5ld1NsaWRlID0gY2hvc2VuU2xpZGU7XG4gICAgfVxuXG4gICAgaWYgKCRuZXdTbGlkZS5sZW5ndGgpIHtcbiAgICAgIC8qKlxuICAgICAgKiBUcmlnZ2VycyBiZWZvcmUgdGhlIG5leHQgc2xpZGUgc3RhcnRzIGFuaW1hdGluZyBpbiBhbmQgb25seSBpZiBhIG5leHQgc2xpZGUgaGFzIGJlZW4gZm91bmQuXG4gICAgICAqIEBldmVudCBPcmJpdCNiZWZvcmVzbGlkZWNoYW5nZVxuICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignYmVmb3Jlc2xpZGVjaGFuZ2UuemYub3JiaXQnLCBbJGN1clNsaWRlLCAkbmV3U2xpZGVdKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIGlkeCA9IGlkeCB8fCB0aGlzLiRzbGlkZXMuaW5kZXgoJG5ld1NsaWRlKTsgLy9ncmFiIGluZGV4IHRvIHVwZGF0ZSBidWxsZXRzXG4gICAgICAgIHRoaXMuX3VwZGF0ZUJ1bGxldHMoaWR4KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51c2VNVUkgJiYgIXRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4oXG4gICAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5jc3Moeydwb3NpdGlvbic6ICdhYnNvbHV0ZScsICd0b3AnOiAwfSksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltSW5Gcm9tJHtkaXJJbn1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJG5ld1NsaWRlLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnYmxvY2snfSlcbiAgICAgICAgICAgIC5hdHRyKCdhcmlhLWxpdmUnLCAncG9saXRlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoXG4gICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1PdXRUbyR7ZGlyT3V0fWBdLFxuICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQXR0cignYXJpYS1saXZlJyk7XG4gICAgICAgICAgICBpZihfdGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICFfdGhpcy50aW1lci5pc1BhdXNlZCl7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVyLnJlc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vZG8gc3R1ZmY/XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpLmhpZGUoKTtcbiAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5hdHRyKCdhcmlhLWxpdmUnLCAncG9saXRlJykuc2hvdygpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICF0aGlzLnRpbWVyLmlzUGF1c2VkKSB7XG4gICAgICAgICAgdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAvKipcbiAgICAqIFRyaWdnZXJzIHdoZW4gdGhlIHNsaWRlIGhhcyBmaW5pc2hlZCBhbmltYXRpbmcgaW4uXG4gICAgKiBAZXZlbnQgT3JiaXQjc2xpZGVjaGFuZ2VcbiAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFskbmV3U2xpZGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBVcGRhdGVzIHRoZSBhY3RpdmUgc3RhdGUgb2YgdGhlIGJ1bGxldHMsIGlmIGRpc3BsYXllZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2xpZGUuXG4gICovXG4gIF91cGRhdGVCdWxsZXRzKGlkeCkge1xuICAgIHZhciAkb2xkQnVsbGV0ID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYm94T2ZCdWxsZXRzfWApXG4gICAgLmZpbmQoJy5pcy1hY3RpdmUnKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJykuYmx1cigpLFxuICAgIHNwYW4gPSAkb2xkQnVsbGV0LmZpbmQoJ3NwYW46bGFzdCcpLmRldGFjaCgpLFxuICAgICRuZXdCdWxsZXQgPSB0aGlzLiRidWxsZXRzLmVxKGlkeCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmFwcGVuZChzcGFuKTtcbiAgfVxuXG4gIC8qKlxuICAqIERlc3Ryb3lzIHRoZSBjYXJvdXNlbCBhbmQgaGlkZXMgdGhlIGVsZW1lbnQuXG4gICogQGZ1bmN0aW9uXG4gICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5vcmJpdCcpLmZpbmQoJyonKS5vZmYoJy56Zi5vcmJpdCcpLmVuZCgpLmhpZGUoKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuT3JiaXQuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBsb29rIGZvciBhbmQgbG9hZEJ1bGxldHMuXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgKiBAZGVmYXVsdCB0cnVlXG4gICovXG4gIGJ1bGxldHM6IHRydWUsXG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBhcHBseSBldmVudCBsaXN0ZW5lcnMgdG8gbmF2IGJ1dHRvbnNcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgbmF2QnV0dG9uczogdHJ1ZSxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgKiBAZGVmYXVsdCAnc2xpZGUtaW4tcmlnaHQnXG4gICovXG4gIGFuaW1JbkZyb21SaWdodDogJ3NsaWRlLWluLXJpZ2h0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgKiBAZGVmYXVsdCAnc2xpZGUtb3V0LXJpZ2h0J1xuICAqL1xuICBhbmltT3V0VG9SaWdodDogJ3NsaWRlLW91dC1yaWdodCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ3NsaWRlLWluLWxlZnQnXG4gICpcbiAgKi9cbiAgYW5pbUluRnJvbUxlZnQ6ICdzbGlkZS1pbi1sZWZ0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgKiBAZGVmYXVsdCAnc2xpZGUtb3V0LWxlZnQnXG4gICovXG4gIGFuaW1PdXRUb0xlZnQ6ICdzbGlkZS1vdXQtbGVmdCcsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBhdXRvbWF0aWNhbGx5IGFuaW1hdGUgb24gcGFnZSBsb2FkLlxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICogQGRlZmF1bHQgdHJ1ZVxuICAqL1xuICBhdXRvUGxheTogdHJ1ZSxcbiAgLyoqXG4gICogQW1vdW50IG9mIHRpbWUsIGluIG1zLCBiZXR3ZWVuIHNsaWRlIHRyYW5zaXRpb25zXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAqIEBkZWZhdWx0IDUwMDBcbiAgKi9cbiAgdGltZXJEZWxheTogNTAwMCxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGluZmluaXRlbHkgbG9vcCB0aHJvdWdoIHRoZSBzbGlkZXNcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgaW5maW5pdGVXcmFwOiB0cnVlLFxuICAvKipcbiAgKiBBbGxvd3MgdGhlIE9yYml0IHNsaWRlcyB0byBiaW5kIHRvIHN3aXBlIGV2ZW50cyBmb3IgbW9iaWxlLCByZXF1aXJlcyBhbiBhZGRpdGlvbmFsIHV0aWwgbGlicmFyeVxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICogQGRlZmF1bHQgdHJ1ZVxuICAqL1xuICBzd2lwZTogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIHRoZSB0aW1pbmcgZnVuY3Rpb24gdG8gcGF1c2UgYW5pbWF0aW9uIG9uIGhvdmVyLlxuICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICogQGRlZmF1bHQgdHJ1ZVxuICAqL1xuICBwYXVzZU9uSG92ZXI6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBiaW5kIGtleWJvYXJkIGV2ZW50cyB0byB0aGUgc2xpZGVyLCB0byBhbmltYXRlIGZyYW1lcyB3aXRoIGFycm93IGtleXNcbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgYWNjZXNzaWJsZTogdHJ1ZSxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGFpbmVyIG9mIE9yYml0XG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAqIEBkZWZhdWx0ICdvcmJpdC1jb250YWluZXInXG4gICovXG4gIGNvbnRhaW5lckNsYXNzOiAnb3JiaXQtY29udGFpbmVyJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byBpbmRpdmlkdWFsIHNsaWRlcy5cbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ29yYml0LXNsaWRlJ1xuICAqL1xuICBzbGlkZUNsYXNzOiAnb3JiaXQtc2xpZGUnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBidWxsZXQgY29udGFpbmVyLiBZb3UncmUgd2VsY29tZS5cbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ29yYml0LWJ1bGxldHMnXG4gICovXG4gIGJveE9mQnVsbGV0czogJ29yYml0LWJ1bGxldHMnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBgbmV4dGAgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAqIEBkZWZhdWx0ICdvcmJpdC1uZXh0J1xuICAqL1xuICBuZXh0Q2xhc3M6ICdvcmJpdC1uZXh0JyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYHByZXZpb3VzYCBuYXZpZ2F0aW9uIGJ1dHRvbi5cbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICogQGRlZmF1bHQgJ29yYml0LXByZXZpb3VzJ1xuICAqL1xuICBwcmV2Q2xhc3M6ICdvcmJpdC1wcmV2aW91cycsXG4gIC8qKlxuICAqIEJvb2xlYW4gdG8gZmxhZyB0aGUganMgdG8gdXNlIG1vdGlvbiB1aSBjbGFzc2VzIG9yIG5vdC4gRGVmYXVsdCB0byB0cnVlIGZvciBiYWNrd2FyZHMgY29tcGF0YWJpbGl0eS5cbiAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAqIEBkZWZhdWx0IHRydWVcbiAgKi9cbiAgdXNlTVVJOiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oT3JiaXQsICdPcmJpdCcpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZU1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVNZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlTWVudSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgcmVzcG9uc2l2ZSBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVNZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLW1lbnUnKTtcbiAgICB0aGlzLmN1cnJlbnRNcSA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbnVsbDtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVNZW51Jyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1lbnUgYnkgcGFyc2luZyB0aGUgY2xhc3NlcyBmcm9tIHRoZSAnZGF0YS1SZXNwb25zaXZlTWVudScgYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIC8vIFRoZSBmaXJzdCB0aW1lIGFuIEludGVyY2hhbmdlIHBsdWdpbiBpcyBpbml0aWFsaXplZCwgdGhpcy5ydWxlcyBpcyBjb252ZXJ0ZWQgZnJvbSBhIHN0cmluZyBvZiBcImNsYXNzZXNcIiB0byBhbiBvYmplY3Qgb2YgcnVsZXNcbiAgICBpZiAodHlwZW9mIHRoaXMucnVsZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgcnVsZXNUcmVlID0ge307XG5cbiAgICAgIC8vIFBhcnNlIHJ1bGVzIGZyb20gXCJjbGFzc2VzXCIgcHVsbGVkIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgIGxldCBydWxlcyA9IHRoaXMucnVsZXMuc3BsaXQoJyAnKTtcblxuICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGV2ZXJ5IHJ1bGUgZm91bmRcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHJ1bGUgPSBydWxlc1tpXS5zcGxpdCgnLScpO1xuICAgICAgICBsZXQgcnVsZVNpemUgPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzBdIDogJ3NtYWxsJztcbiAgICAgICAgbGV0IHJ1bGVQbHVnaW4gPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzFdIDogcnVsZVswXTtcblxuICAgICAgICBpZiAoTWVudVBsdWdpbnNbcnVsZVBsdWdpbl0gIT09IG51bGwpIHtcbiAgICAgICAgICBydWxlc1RyZWVbcnVsZVNpemVdID0gTWVudVBsdWdpbnNbcnVsZVBsdWdpbl07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ydWxlcyA9IHJ1bGVzVHJlZTtcbiAgICB9XG5cbiAgICBpZiAoISQuaXNFbXB0eU9iamVjdCh0aGlzLnJ1bGVzKSkge1xuICAgICAgdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICB9XG4gICAgLy8gQWRkIGRhdGEtbXV0YXRlIHNpbmNlIGNoaWxkcmVuIG1heSBuZWVkIGl0LlxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1tdXRhdGUnLCAodGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLW11dGF0ZScpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3Jlc3BvbnNpdmUtbWVudScpKSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgTWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfSk7XG4gICAgLy8gJCh3aW5kb3cpLm9uKCdyZXNpemUuemYuUmVzcG9uc2l2ZU1lbnUnLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIC8vIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBzY3JlZW4gd2lkdGggYWdhaW5zdCBhdmFpbGFibGUgbWVkaWEgcXVlcmllcy4gSWYgdGhlIG1lZGlhIHF1ZXJ5IGhhcyBjaGFuZ2VkLCBhbmQgdGhlIHBsdWdpbiBuZWVkZWQgaGFzIGNoYW5nZWQsIHRoZSBwbHVnaW5zIHdpbGwgc3dhcCBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTWVkaWFRdWVyaWVzKCkge1xuICAgIHZhciBtYXRjaGVkTXEsIF90aGlzID0gdGhpcztcbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlIGFuZCBmaW5kIHRoZSBsYXN0IG1hdGNoaW5nIHJ1bGVcbiAgICAkLmVhY2godGhpcy5ydWxlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3Qoa2V5KSkge1xuICAgICAgICBtYXRjaGVkTXEgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBObyBtYXRjaD8gTm8gZGljZVxuICAgIGlmICghbWF0Y2hlZE1xKSByZXR1cm47XG5cbiAgICAvLyBQbHVnaW4gYWxyZWFkeSBpbml0aWFsaXplZD8gV2UgZ29vZFxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4gaW5zdGFuY2VvZiB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKSByZXR1cm47XG5cbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcGx1Z2luLXNwZWNpZmljIENTUyBjbGFzc2VzXG4gICAgJC5lYWNoKE1lbnVQbHVnaW5zLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyh2YWx1ZS5jc3NDbGFzcyk7XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIENTUyBjbGFzcyBmb3IgdGhlIG5ldyBwbHVnaW5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5jc3NDbGFzcyk7XG5cbiAgICAvLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIG5ldyBwbHVnaW5cbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luKSB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG5ldyB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKHRoaXMuJGVsZW1lbnQsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgdGhlIGN1cnJlbnQgcGx1Z2luIG9uIHRoaXMgZWxlbWVudCwgYXMgd2VsbCBhcyB0aGUgd2luZG93IHJlc2l6ZSBoYW5kbGVyIHRoYXQgc3dpdGNoZXMgdGhlIHBsdWdpbnMgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICAkKHdpbmRvdykub2ZmKCcuemYuUmVzcG9uc2l2ZU1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZU1lbnUuZGVmYXVsdHMgPSB7fTtcblxuLy8gVGhlIHBsdWdpbiBtYXRjaGVzIHRoZSBwbHVnaW4gY2xhc3NlcyB3aXRoIHRoZXNlIHBsdWdpbiBpbnN0YW5jZXMuXG52YXIgTWVudVBsdWdpbnMgPSB7XG4gIGRyb3Bkb3duOiB7XG4gICAgY3NzQ2xhc3M6ICdkcm9wZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcm9wZG93bi1tZW51J10gfHwgbnVsbFxuICB9LFxuIGRyaWxsZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJpbGxkb3duJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2RyaWxsZG93biddIHx8IG51bGxcbiAgfSxcbiAgYWNjb3JkaW9uOiB7XG4gICAgY3NzQ2xhc3M6ICdhY2NvcmRpb24tbWVudScsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydhY2NvcmRpb24tbWVudSddIHx8IG51bGxcbiAgfVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVNZW51LCAnUmVzcG9uc2l2ZU1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVUb2dnbGUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICovXG5cbmNsYXNzIFJlc3BvbnNpdmVUb2dnbGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUYWIgQmFyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIHRhYiBiYXIgZnVuY3Rpb25hbGl0eSB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlVG9nZ2xlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRhYiBiYXIgYnkgZmluZGluZyB0aGUgdGFyZ2V0IGVsZW1lbnQsIHRvZ2dsaW5nIGVsZW1lbnQsIGFuZCBydW5uaW5nIHVwZGF0ZSgpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciB0YXJnZXRJRCA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS10b2dnbGUnKTtcbiAgICBpZiAoIXRhcmdldElEKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdZb3VyIHRhYiBiYXIgbmVlZHMgYW4gSUQgb2YgYSBNZW51IGFzIHRoZSB2YWx1ZSBvZiBkYXRhLXRhYi1iYXIuJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdGFyZ2V0TWVudSA9ICQoYCMke3RhcmdldElEfWApO1xuICAgIHRoaXMuJHRvZ2dsZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXRvZ2dsZV0nKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzKS5kYXRhKCd0b2dnbGUnKTtcbiAgICAgIHJldHVybiAodGFyZ2V0ID09PSB0YXJnZXRJRCB8fCB0YXJnZXQgPT09IFwiXCIpO1xuICAgIH0pO1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMsIHRoaXMuJHRhcmdldE1lbnUuZGF0YSgpKTtcblxuICAgIC8vIElmIHRoZXkgd2VyZSBzZXQsIHBhcnNlIHRoZSBhbmltYXRpb24gY2xhc3Nlc1xuICAgIGlmKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICBsZXQgaW5wdXQgPSB0aGlzLm9wdGlvbnMuYW5pbWF0ZS5zcGxpdCgnICcpO1xuXG4gICAgICB0aGlzLmFuaW1hdGlvbkluID0gaW5wdXRbMF07XG4gICAgICB0aGlzLmFuaW1hdGlvbk91dCA9IGlucHV0WzFdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSB0YWIgYmFyIHRvIHdvcmsuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy5fdXBkYXRlTXFIYW5kbGVyID0gdGhpcy5fdXBkYXRlLmJpbmQodGhpcyk7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG5cbiAgICB0aGlzLiR0b2dnbGVyLm9uKCdjbGljay56Zi5yZXNwb25zaXZlVG9nZ2xlJywgdGhpcy50b2dnbGVNZW51LmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBtZWRpYSBxdWVyeSB0byBkZXRlcm1pbmUgaWYgdGhlIHRhYiBiYXIgc2hvdWxkIGJlIHZpc2libGUgb3IgaGlkZGVuLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGUoKSB7XG4gICAgLy8gTW9iaWxlXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdygpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5oaWRlKCk7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhci4gVGhlIHRvZ2dsZSBvbmx5IGhhcHBlbnMgaWYgdGhlIHNjcmVlbiBpcyBzbWFsbCBlbm91Z2ggdG8gYWxsb3cgaXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAqL1xuICB0b2dnbGVNZW51KCkge1xuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIgdG9nZ2xlcy5cbiAgICAgICAqIEBldmVudCBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICAgICAqL1xuICAgICAgaWYodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgICAgaWYgKHRoaXMuJHRhcmdldE1lbnUuaXMoJzpoaWRkZW4nKSkge1xuICAgICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiR0YXJnZXRNZW51LCB0aGlzLmFuaW1hdGlvbkluLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgICAgICAgICAgdGhpcy4kdGFyZ2V0TWVudS5maW5kKCdbZGF0YS1tdXRhdGVdJykudHJpZ2dlckhhbmRsZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJHRhcmdldE1lbnUsIHRoaXMuYW5pbWF0aW9uT3V0LCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy4kdGFyZ2V0TWVudS50b2dnbGUoMCk7XG4gICAgICAgIHRoaXMuJHRhcmdldE1lbnUuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICB0aGlzLiR0b2dnbGVyLm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcblxuICAgICQod2luZG93KS5vZmYoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRoZSBicmVha3BvaW50IGFmdGVyIHdoaWNoIHRoZSBtZW51IGlzIGFsd2F5cyBzaG93biwgYW5kIHRoZSB0YWIgYmFyIGlzIGhpZGRlbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnbWVkaXVtJ1xuICAgKi9cbiAgaGlkZUZvcjogJ21lZGl1bScsXG5cbiAgLyoqXG4gICAqIFRvIGRlY2lkZSBpZiB0aGUgdG9nZ2xlIHNob3VsZCBiZSBhbmltYXRlZCBvciBub3QuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhbmltYXRlOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVUb2dnbGUsICdSZXNwb25zaXZlVG9nZ2xlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXZlYWwgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJldmVhbFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb24gaWYgdXNpbmcgYW5pbWF0aW9uc1xuICovXG5cbmNsYXNzIFJldmVhbCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFJldmVhbC5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgZm9yIHRoZSBtb2RhbC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXZlYWwuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXZlYWwnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdSZXZlYWwnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbW9kYWwgYnkgYWRkaW5nIHRoZSBvdmVybGF5IGFuZCBjbG9zZSBidXR0b25zLCAoaWYgc2VsZWN0ZWQpLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5pZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5jYWNoZWQgPSB7bXE6IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5jdXJyZW50fTtcbiAgICB0aGlzLmlzTW9iaWxlID0gbW9iaWxlU25pZmYoKTtcblxuICAgIHRoaXMuJGFuY2hvciA9ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkubGVuZ3RoID8gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKSA6ICQoYFtkYXRhLXRvZ2dsZT1cIiR7dGhpcy5pZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6IHRoaXMuaWQsXG4gICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnZnVsbCcpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiA9IHRydWU7XG4gICAgICB0aGlzLm9wdGlvbnMub3ZlcmxheSA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgIXRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkgPSB0aGlzLl9tYWtlT3ZlcmxheSh0aGlzLmlkKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICdkaWFsb2cnLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgICAnZGF0YS15ZXRpLWJveCc6IHRoaXMuaWQsXG4gICAgICAgICdkYXRhLXJlc2l6ZSc6IHRoaXMuaWRcbiAgICB9KTtcblxuICAgIGlmKHRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuZGV0YWNoKCkuYXBwZW5kVG8odGhpcy4kb3ZlcmxheSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuZGV0YWNoKCkuYXBwZW5kVG8oJCh0aGlzLm9wdGlvbnMuYXBwZW5kVG8pKTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3dpdGhvdXQtb3ZlcmxheScpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rICYmIHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSAoIGAjJHt0aGlzLmlkfWApKSB7XG4gICAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnJldmVhbCcsIHRoaXMub3Blbi5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvdmVybGF5IGRpdiB0byBkaXNwbGF5IGJlaGluZCB0aGUgbW9kYWwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfbWFrZU92ZXJsYXkoKSB7XG4gICAgcmV0dXJuICQoJzxkaXY+PC9kaXY+JylcbiAgICAgIC5hZGRDbGFzcygncmV2ZWFsLW92ZXJsYXknKVxuICAgICAgLmFwcGVuZFRvKHRoaXMub3B0aW9ucy5hcHBlbmRUbyk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBwb3NpdGlvbiBvZiBtb2RhbFxuICAgKiBUT0RPOiAgRmlndXJlIG91dCBpZiB3ZSBhY3R1YWxseSBuZWVkIHRvIGNhY2hlIHRoZXNlIHZhbHVlcyBvciBpZiBpdCBkb2Vzbid0IG1hdHRlclxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZVBvc2l0aW9uKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJXaWR0aCgpO1xuICAgIHZhciBvdXRlcldpZHRoID0gJCh3aW5kb3cpLndpZHRoKCk7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuJGVsZW1lbnQub3V0ZXJIZWlnaHQoKTtcbiAgICB2YXIgb3V0ZXJIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgdmFyIGxlZnQsIHRvcDtcbiAgICBpZiAodGhpcy5vcHRpb25zLmhPZmZzZXQgPT09ICdhdXRvJykge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KChvdXRlcldpZHRoIC0gd2lkdGgpIC8gMiwgMTApO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZWZ0ID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLmhPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy52T2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGlmIChoZWlnaHQgPiBvdXRlckhlaWdodCkge1xuICAgICAgICB0b3AgPSBwYXJzZUludChNYXRoLm1pbigxMDAsIG91dGVySGVpZ2h0IC8gMTApLCAxMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b3AgPSBwYXJzZUludCgob3V0ZXJIZWlnaHQgLSBoZWlnaHQpIC8gNCwgMTApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0b3AgPSBwYXJzZUludCh0aGlzLm9wdGlvbnMudk9mZnNldCwgMTApO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LmNzcyh7dG9wOiB0b3AgKyAncHgnfSk7XG4gICAgLy8gb25seSB3b3JyeSBhYm91dCBsZWZ0IGlmIHdlIGRvbid0IGhhdmUgYW4gb3ZlcmxheSBvciB3ZSBoYXZlYSAgaG9yaXpvbnRhbCBvZmZzZXQsXG4gICAgLy8gb3RoZXJ3aXNlIHdlJ3JlIHBlcmZlY3RseSBpbiB0aGUgbWlkZGxlXG4gICAgaWYoIXRoaXMuJG92ZXJsYXkgfHwgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICE9PSAnYXV0bycpKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bGVmdDogbGVmdCArICdweCd9KTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHttYXJnaW46ICcwcHgnfSk7XG4gICAgfVxuXG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IChldmVudCwgJGVsZW1lbnQpID0+IHtcbiAgICAgICAgaWYgKChldmVudC50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdKSB8fFxuICAgICAgICAgICAgKCQoZXZlbnQudGFyZ2V0KS5wYXJlbnRzKCdbZGF0YS1jbG9zYWJsZV0nKVswXSA9PT0gJGVsZW1lbnQpKSB7IC8vIG9ubHkgY2xvc2UgcmV2ZWFsIHdoZW4gaXQncyBleHBsaWNpdGx5IGNhbGxlZFxuICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlLmFwcGx5KHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvci5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJGFuY2hvci5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLndoaWNoID09PSAxMyB8fCBlLndoaWNoID09PSAzMikge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgdGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkub2ZmKCcuemYucmV2ZWFsJykub24oJ2NsaWNrLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fFxuICAgICAgICAgICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSB8fFxuICAgICAgICAgICAgISQuY29udGFpbnMoZG9jdW1lbnQsIGUudGFyZ2V0KSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAkKHdpbmRvdykub24oYHBvcHN0YXRlLnpmLnJldmVhbDoke3RoaXMuaWR9YCwgdGhpcy5faGFuZGxlU3RhdGUuYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgbW9kYWwgbWV0aG9kcyBvbiBiYWNrL2ZvcndhcmQgYnV0dG9uIGNsaWNrcyBvciBhbnkgb3RoZXIgZXZlbnQgdGhhdCB0cmlnZ2VycyBwb3BzdGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oYW5kbGVTdGF0ZShlKSB7XG4gICAgaWYod2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggJyMnICsgdGhpcy5pZCkgJiYgIXRoaXMuaXNBY3RpdmUpeyB0aGlzLm9wZW4oKTsgfVxuICAgIGVsc2V7IHRoaXMuY2xvc2UoKTsgfVxuICB9XG5cblxuICAvKipcbiAgICogT3BlbnMgdGhlIG1vZGFsIGNvbnRyb2xsZWQgYnkgYHRoaXMuJGFuY2hvcmAsIGFuZCBjbG9zZXMgYWxsIG90aGVycyBieSBkZWZhdWx0LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZW1lXG4gICAqIEBmaXJlcyBSZXZlYWwjb3BlblxuICAgKi9cbiAgb3BlbigpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICB2YXIgaGFzaCA9IGAjJHt0aGlzLmlkfWA7XG5cbiAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpIHtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gTWFrZSBlbGVtZW50cyBpbnZpc2libGUsIGJ1dCByZW1vdmUgZGlzcGxheTogbm9uZSBzbyB3ZSBjYW4gZ2V0IHNpemUgYW5kIHBvc2l0aW9uaW5nXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJyB9KVxuICAgICAgICAuc2hvdygpXG4gICAgICAgIC5zY3JvbGxUb3AoMCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJ30pLnNob3coKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVQb3NpdGlvbigpO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmhpZGUoKVxuICAgICAgLmNzcyh7ICd2aXNpYmlsaXR5JzogJycgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmNzcyh7J3Zpc2liaWxpdHknOiAnJ30pLmhpZGUoKTtcbiAgICAgIGlmKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Zhc3QnKSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdmYXN0Jyk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3Nsb3cnKSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdzbG93Jyk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aXBsZU9wZW5lZCkge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG1vZGFsIG9wZW5zLlxuICAgICAgICogQ2xvc2VzIGFueSBvdGhlciBtb2RhbHMgdGhhdCBhcmUgY3VycmVudGx5IG9wZW5cbiAgICAgICAqIEBldmVudCBSZXZlYWwjY2xvc2VtZVxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYucmV2ZWFsJywgdGhpcy5pZCk7XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIGFkZFJldmVhbE9wZW5DbGFzc2VzKCkge1xuICAgICAgaWYgKF90aGlzLmlzTW9iaWxlKSB7XG4gICAgICAgIGlmKCFfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcykge1xuICAgICAgICAgIF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgcmV2ZWFsXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25Jbikge1xuICAgICAgZnVuY3Rpb24gYWZ0ZXJBbmltYXRpb24oKXtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnRcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcbiAgICAgICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZm9jdXMoKTtcbiAgICAgICAgYWRkUmV2ZWFsT3BlbkNsYXNzZXMoKTtcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXMoX3RoaXMuJGVsZW1lbnQpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRvdmVybGF5LCAnZmFkZS1pbicpO1xuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25JbiwgKCkgPT4ge1xuICAgICAgICBpZih0aGlzLiRlbGVtZW50KSB7IC8vIHByb3RlY3QgYWdhaW5zdCBvYmplY3QgaGF2aW5nIGJlZW4gcmVtb3ZlZFxuICAgICAgICAgIHRoaXMuZm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUodGhpcy4kZWxlbWVudCk7XG4gICAgICAgICAgYWZ0ZXJBbmltYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgcmV2ZWFsXG4gICAgZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5zaG93KDApO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KHRoaXMub3B0aW9ucy5zaG93RGVsYXkpO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBhY2Nlc3NpYmlsaXR5XG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmF0dHIoe1xuICAgICAgICAnYXJpYS1oaWRkZW4nOiBmYWxzZSxcbiAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgIH0pXG4gICAgICAuZm9jdXMoKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnRyYXBGb2N1cyh0aGlzLiRlbGVtZW50KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGhhcyBzdWNjZXNzZnVsbHkgb3BlbmVkLlxuICAgICAqIEBldmVudCBSZXZlYWwjb3BlblxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb3Blbi56Zi5yZXZlYWwnKTtcblxuICAgIGFkZFJldmVhbE9wZW5DbGFzc2VzKCk7XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuX2V4dHJhSGFuZGxlcnMoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV4dHJhIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgYm9keSBhbmQgd2luZG93IGlmIG5lY2Vzc2FyeS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9leHRyYUhhbmRsZXJzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQpIHsgcmV0dXJuOyB9IC8vIElmIHdlJ3JlIGluIHRoZSBtaWRkbGUgb2YgY2xlYW51cCwgZG9uJ3QgZnJlYWsgb3V0XG4gICAgdGhpcy5mb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiAhdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4pIHtcbiAgICAgICQoJ2JvZHknKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8XG4gICAgICAgICAgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpIHx8XG4gICAgICAgICAgICAhJC5jb250YWlucyhkb2N1bWVudCwgZS50YXJnZXQpKSB7IHJldHVybjsgfVxuICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAkKHdpbmRvdykub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnUmV2ZWFsJywge1xuICAgICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBsb2NrIGZvY3VzIHdpdGhpbiBtb2RhbCB3aGlsZSB0YWJiaW5nXG4gICAgdGhpcy4kZWxlbWVudC5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgJHRhcmdldCA9ICQodGhpcyk7XG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnUmV2ZWFsJywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtY2xvc2VdJykpKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyAvLyBzZXQgZm9jdXMgYmFjayB0byBhbmNob3IgaWYgY2xvc2UgYnV0dG9uIGhhcyBiZWVuIGFjdGl2YXRlZFxuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCR0YXJnZXQuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMpKSB7IC8vIGRvbnQndCB0cmlnZ2VyIGlmIGFjdWFsIGVsZW1lbnQgaGFzIGZvY3VzIChpLmUuIGlucHV0cywgbGlua3MsIC4uLilcbiAgICAgICAgICAgIF90aGlzLm9wZW4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmV2ZWFsI2Nsb3NlZFxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYgKCF0aGlzLmlzQWN0aXZlIHx8ICF0aGlzLiRlbGVtZW50LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBNb3Rpb24gVUkgbWV0aG9kIG9mIGhpZGluZ1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uT3V0KSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRvdmVybGF5LCAnZmFkZS1vdXQnLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cblxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uT3V0KTtcbiAgICB9XG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiBoaWRpbmdcbiAgICBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LmhpZGUoMCwgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGVsZW1lbnQuaGlkZSh0aGlzLm9wdGlvbnMuaGlkZURlbGF5KTtcbiAgICB9XG5cbiAgICAvLyBDb25kaXRpb25hbHMgdG8gcmVtb3ZlIGV4dHJhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCBvbiBvcGVuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAkKHdpbmRvdykub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm92ZXJsYXkgJiYgdGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgJCgnYm9keScpLm9mZignY2xpY2suemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG5cbiAgICBmdW5jdGlvbiBmaW5pc2hVcCgpIHtcbiAgICAgIGlmIChfdGhpcy5pc01vYmlsZSkge1xuICAgICAgICAkKCdodG1sLCBib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICAgIGlmKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKSB7XG4gICAgICAgICAgJCgnYm9keScpLnNjcm9sbFRvcChfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyk7XG4gICAgICAgICAgX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgfVxuXG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVsZWFzZUZvY3VzKF90aGlzLiRlbGVtZW50KTtcblxuICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICAgLyoqXG4gICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGlzIGRvbmUgY2xvc2luZy5cbiAgICAgICogQGV2ZW50IFJldmVhbCNjbG9zZWRcbiAgICAgICovXG4gICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBSZXNldHMgdGhlIG1vZGFsIGNvbnRlbnRcbiAgICAqIFRoaXMgcHJldmVudHMgYSBydW5uaW5nIHZpZGVvIHRvIGtlZXAgZ29pbmcgaW4gdGhlIGJhY2tncm91bmRcbiAgICAqL1xuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzZXRPbkNsb3NlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lmh0bWwodGhpcy4kZWxlbWVudC5odG1sKCkpO1xuICAgIH1cblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgaWYgKF90aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICBpZiAod2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKSB7XG4gICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoJycsIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKGAjJHt0aGlzLmlkfWAsICcnKSk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgfVxuICAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb3Blbi9jbG9zZWQgc3RhdGUgb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmFwcGVuZFRvKCQodGhpcy5vcHRpb25zLmFwcGVuZFRvKSk7IC8vIG1vdmUgJGVsZW1lbnQgb3V0c2lkZSBvZiAkb3ZlcmxheSB0byBwcmV2ZW50IGVycm9yIHVucmVnaXN0ZXJQbHVnaW4oKVxuICAgICAgdGhpcy4kb3ZlcmxheS5oaWRlKCkub2ZmKCkucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpLm9mZigpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56ZicpO1xuICAgICQod2luZG93KS5vZmYoYC56Zi5yZXZlYWw6JHt0aGlzLmlkfWApO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9O1xufVxuXG5SZXZlYWwuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBhbmltYXRpb25JbjogJycsXG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBhbmltYXRpb25PdXQ6ICcnLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBvcGVuaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAwXG4gICAqL1xuICBzaG93RGVsYXk6IDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gZGVsYXkgdGhlIGNsb3Npbmcgb2YgYSBtb2RhbCBhZnRlciBhIGNsaWNrIGlmIG5vIGFuaW1hdGlvbiB1c2VkLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIGhpZGVEZWxheTogMCxcbiAgLyoqXG4gICAqIEFsbG93cyBhIGNsaWNrIG9uIHRoZSBib2R5L292ZXJsYXkgdG8gY2xvc2UgdGhlIG1vZGFsLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGNsb3NlIGlmIHRoZSB1c2VyIHByZXNzZXMgdGhlIGBFU0NBUEVgIGtleS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkVzYzogdHJ1ZSxcbiAgLyoqXG4gICAqIElmIHRydWUsIGFsbG93cyBtdWx0aXBsZSBtb2RhbHMgdG8gYmUgZGlzcGxheWVkIGF0IG9uY2UuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBtdWx0aXBsZU9wZW5lZDogZmFsc2UsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggZG93biBmcm9tIHRoZSB0b3Agb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfHN0cmluZ31cbiAgICogQGRlZmF1bHQgYXV0b1xuICAgKi9cbiAgdk9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIG1vZGFsIHNob3VsZCBwdXNoIGluIGZyb20gdGhlIHNpZGUgb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfHN0cmluZ31cbiAgICogQGRlZmF1bHQgYXV0b1xuICAgKi9cbiAgaE9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBiZSBmdWxsc2NyZWVuLCBjb21wbGV0ZWx5IGJsb2NraW5nIG91dCB0aGUgcmVzdCBvZiB0aGUgdmlldy4gSlMgY2hlY2tzIGZvciB0aGlzIGFzIHdlbGwuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBmdWxsU2NyZWVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBlcmNlbnRhZ2Ugb2Ygc2NyZWVuIGhlaWdodCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggdXAgZnJvbSB0aGUgYm90dG9tIG9mIHRoZSB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDEwXG4gICAqL1xuICBidG1PZmZzZXRQY3Q6IDEwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBnZW5lcmF0ZSBhbiBvdmVybGF5IGRpdiwgd2hpY2ggd2lsbCBjb3ZlciB0aGUgdmlldyB3aGVuIG1vZGFsIG9wZW5zLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBvdmVybGF5OiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byByZW1vdmUgYW5kIHJlaW5qZWN0IG1hcmt1cCBvbiBjbG9zZS4gU2hvdWxkIGJlIHRydWUgaWYgdXNpbmcgdmlkZW8gZWxlbWVudHMgdy9vIHVzaW5nIHByb3ZpZGVyJ3MgYXBpLCBvdGhlcndpc2UsIHZpZGVvcyB3aWxsIGNvbnRpbnVlIHRvIHBsYXkgaW4gdGhlIGJhY2tncm91bmQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZXNldE9uQ2xvc2U6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBhbHRlciB0aGUgdXJsIG9uIG9wZW4vY2xvc2UsIGFuZCBhbGxvd3MgdGhlIHVzZSBvZiB0aGUgYGJhY2tgIGJ1dHRvbiB0byBjbG9zZSBtb2RhbHMuIEFMU08sIGFsbG93cyBhIG1vZGFsIHRvIGF1dG8tbWFuaWFjYWxseSBvcGVuIG9uIHBhZ2UgbG9hZCBJRiB0aGUgaGFzaCA9PT0gdGhlIG1vZGFsJ3MgdXNlci1zZXQgaWQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBkZWVwTGluazogZmFsc2UsXG4gICAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYXBwZW5kIHRvIGN1c3RvbSBkaXYuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgXCJib2R5XCJcbiAgICovXG4gIGFwcGVuZFRvOiBcImJvZHlcIlxuXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmV2ZWFsLCAnUmV2ZWFsJyk7XG5cbmZ1bmN0aW9uIGlQaG9uZVNuaWZmKCkge1xuICByZXR1cm4gL2lQKGFkfGhvbmV8b2QpLipPUy8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIGFuZHJvaWRTbmlmZigpIHtcbiAgcmV0dXJuIC9BbmRyb2lkLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcbn1cblxuZnVuY3Rpb24gbW9iaWxlU25pZmYoKSB7XG4gIHJldHVybiBpUGhvbmVTbmlmZigpIHx8IGFuZHJvaWRTbmlmZigpO1xufVxuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogU2xpZGVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5zbGlkZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRvdWNoXG4gKi9cblxuY2xhc3MgU2xpZGVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBzbGlkZXIgY29udHJvbC5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYSBzbGlkZXIgY29udHJvbC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTbGlkZXIuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1NsaWRlcicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1NsaWRlcicsIHtcbiAgICAgICdsdHInOiB7XG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19VUCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19ET1dOJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnZGVjcmVhc2UnLFxuICAgICAgICAnU0hJRlRfQVJST1dfUklHSFQnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19VUCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0RPV04nOiAnZGVjcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19MRUZUJzogJ2RlY3JlYXNlX2Zhc3QnXG4gICAgICB9LFxuICAgICAgJ3J0bCc6IHtcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfUklHSFQnOiAnZGVjcmVhc2UnLFxuICAgICAgICAnU0hJRlRfQVJST1dfTEVGVCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlX2Zhc3QnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlsaXplcyB0aGUgcGx1Z2luIGJ5IHJlYWRpbmcvc2V0dGluZyBhdHRyaWJ1dGVzLCBjcmVhdGluZyBjb2xsZWN0aW9ucyBhbmQgc2V0dGluZyB0aGUgaW5pdGlhbCBwb3NpdGlvbiBvZiB0aGUgaGFuZGxlKHMpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuICAgIHRoaXMuaGFuZGxlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWhhbmRsZV0nKTtcblxuICAgIHRoaXMuJGhhbmRsZSA9IHRoaXMuaGFuZGxlcy5lcSgwKTtcbiAgICB0aGlzLiRpbnB1dCA9IHRoaXMuaW5wdXRzLmxlbmd0aCA/IHRoaXMuaW5wdXRzLmVxKDApIDogJChgIyR7dGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKTtcbiAgICB0aGlzLiRmaWxsID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zbGlkZXItZmlsbF0nKS5jc3ModGhpcy5vcHRpb25zLnZlcnRpY2FsID8gJ2hlaWdodCcgOiAnd2lkdGgnLCAwKTtcblxuICAgIHZhciBpc0RibCA9IGZhbHNlLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kaXNhYmxlZCB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5pbnB1dHMgPSAkKCkuYWRkKHRoaXMuJGlucHV0KTtcbiAgICAgIHRoaXMub3B0aW9ucy5iaW5kaW5nID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXRJbml0QXR0cigwKTtcblxuICAgIGlmICh0aGlzLmhhbmRsZXNbMV0pIHtcbiAgICAgIHRoaXMub3B0aW9ucy5kb3VibGVTaWRlZCA9IHRydWU7XG4gICAgICB0aGlzLiRoYW5kbGUyID0gdGhpcy5oYW5kbGVzLmVxKDEpO1xuICAgICAgdGhpcy4kaW5wdXQyID0gdGhpcy5pbnB1dHMubGVuZ3RoID4gMSA/IHRoaXMuaW5wdXRzLmVxKDEpIDogJChgIyR7dGhpcy4kaGFuZGxlMi5hdHRyKCdhcmlhLWNvbnRyb2xzJyl9YCk7XG5cbiAgICAgIGlmICghdGhpcy5pbnB1dHNbMV0pIHtcbiAgICAgICAgdGhpcy5pbnB1dHMgPSB0aGlzLmlucHV0cy5hZGQodGhpcy4kaW5wdXQyKTtcbiAgICAgIH1cbiAgICAgIGlzRGJsID0gdHJ1ZTtcblxuICAgICAgLy8gdGhpcy4kaGFuZGxlLnRyaWdnZXJIYW5kbGVyKCdjbGljay56Zi5zbGlkZXInKTtcbiAgICAgIHRoaXMuX3NldEluaXRBdHRyKDEpO1xuICAgIH1cblxuICAgIC8vIFNldCBoYW5kbGUgcG9zaXRpb25zXG4gICAgdGhpcy5zZXRIYW5kbGVzKCk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIHNldEhhbmRsZXMoKSB7XG4gICAgaWYodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLmlucHV0cy5lcSgwKS52YWwoKSwgdHJ1ZSwgKCkgPT4ge1xuICAgICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlMiwgdGhpcy5pbnB1dHMuZXEoMSkudmFsKCksIHRydWUpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3NldEhhbmRsZVBvcyh0aGlzLiRoYW5kbGUsIHRoaXMuaW5wdXRzLmVxKDApLnZhbCgpLCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICBfcmVmbG93KCkge1xuICAgIHRoaXMuc2V0SGFuZGxlcygpO1xuICB9XG4gIC8qKlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIC0gZmxvYXRpbmcgcG9pbnQgKHRoZSB2YWx1ZSkgdG8gYmUgdHJhbnNmb3JtZWQgdXNpbmcgdG8gYSByZWxhdGl2ZSBwb3NpdGlvbiBvbiB0aGUgc2xpZGVyICh0aGUgaW52ZXJzZSBvZiBfdmFsdWUpXG4gICovXG4gIF9wY3RPZkJhcih2YWx1ZSkge1xuICAgIHZhciBwY3RPZkJhciA9IHBlcmNlbnQodmFsdWUgLSB0aGlzLm9wdGlvbnMuc3RhcnQsIHRoaXMub3B0aW9ucy5lbmQgLSB0aGlzLm9wdGlvbnMuc3RhcnQpXG5cbiAgICBzd2l0Y2godGhpcy5vcHRpb25zLnBvc2l0aW9uVmFsdWVGdW5jdGlvbikge1xuICAgIGNhc2UgXCJwb3dcIjpcbiAgICAgIHBjdE9mQmFyID0gdGhpcy5fbG9nVHJhbnNmb3JtKHBjdE9mQmFyKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJsb2dcIjpcbiAgICAgIHBjdE9mQmFyID0gdGhpcy5fcG93VHJhbnNmb3JtKHBjdE9mQmFyKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBwY3RPZkJhci50b0ZpeGVkKDIpXG4gIH1cblxuICAvKipcbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSBwY3RPZkJhciAtIGZsb2F0aW5nIHBvaW50LCB0aGUgcmVsYXRpdmUgcG9zaXRpb24gb2YgdGhlIHNsaWRlciAodHlwaWNhbGx5IGJldHdlZW4gMC0xKSB0byBiZSB0cmFuc2Zvcm1lZCB0byBhIHZhbHVlXG4gICovXG4gIF92YWx1ZShwY3RPZkJhcikge1xuICAgIHN3aXRjaCh0aGlzLm9wdGlvbnMucG9zaXRpb25WYWx1ZUZ1bmN0aW9uKSB7XG4gICAgY2FzZSBcInBvd1wiOlxuICAgICAgcGN0T2ZCYXIgPSB0aGlzLl9wb3dUcmFuc2Zvcm0ocGN0T2ZCYXIpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImxvZ1wiOlxuICAgICAgcGN0T2ZCYXIgPSB0aGlzLl9sb2dUcmFuc2Zvcm0ocGN0T2ZCYXIpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciB2YWx1ZSA9ICh0aGlzLm9wdGlvbnMuZW5kIC0gdGhpcy5vcHRpb25zLnN0YXJ0KSAqIHBjdE9mQmFyICsgdGhpcy5vcHRpb25zLnN0YXJ0O1xuXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvKipcbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAtIGZsb2F0aW5nIHBvaW50ICh0eXBpY2FsbHkgYmV0d2VlbiAwLTEpIHRvIGJlIHRyYW5zZm9ybWVkIHVzaW5nIHRoZSBsb2cgZnVuY3Rpb25cbiAgKi9cbiAgX2xvZ1RyYW5zZm9ybSh2YWx1ZSkge1xuICAgIHJldHVybiBiYXNlTG9nKHRoaXMub3B0aW9ucy5ub25MaW5lYXJCYXNlLCAoKHZhbHVlKih0aGlzLm9wdGlvbnMubm9uTGluZWFyQmFzZS0xKSkrMSkpXG4gIH1cblxuICAvKipcbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSAtIGZsb2F0aW5nIHBvaW50ICh0eXBpY2FsbHkgYmV0d2VlbiAwLTEpIHRvIGJlIHRyYW5zZm9ybWVkIHVzaW5nIHRoZSBwb3dlciBmdW5jdGlvblxuICAqL1xuICBfcG93VHJhbnNmb3JtKHZhbHVlKSB7XG4gICAgcmV0dXJuIChNYXRoLnBvdyh0aGlzLm9wdGlvbnMubm9uTGluZWFyQmFzZSwgdmFsdWUpIC0gMSkgLyAodGhpcy5vcHRpb25zLm5vbkxpbmVhckJhc2UgLSAxKVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzZWxlY3RlZCBoYW5kbGUgYW5kIGZpbGwgYmFyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRobmRsIC0gdGhlIHNlbGVjdGVkIGhhbmRsZSB0byBtb3ZlLlxuICAgKiBAcGFyYW0ge051bWJlcn0gbG9jYXRpb24gLSBmbG9hdGluZyBwb2ludCBiZXR3ZWVuIHRoZSBzdGFydCBhbmQgZW5kIHZhbHVlcyBvZiB0aGUgc2xpZGVyIGJhci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIG9uIGNvbXBsZXRpb24uXG4gICAqIEBmaXJlcyBTbGlkZXIjbW92ZWRcbiAgICogQGZpcmVzIFNsaWRlciNjaGFuZ2VkXG4gICAqL1xuICBfc2V0SGFuZGxlUG9zKCRobmRsLCBsb2NhdGlvbiwgbm9JbnZlcnQsIGNiKSB7XG4gICAgLy8gZG9uJ3QgbW92ZSBpZiB0aGUgc2xpZGVyIGhhcyBiZWVuIGRpc2FibGVkIHNpbmNlIGl0cyBpbml0aWFsaXphdGlvblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL21pZ2h0IG5lZWQgdG8gYWx0ZXIgdGhhdCBzbGlnaHRseSBmb3IgYmFycyB0aGF0IHdpbGwgaGF2ZSBvZGQgbnVtYmVyIHNlbGVjdGlvbnMuXG4gICAgbG9jYXRpb24gPSBwYXJzZUZsb2F0KGxvY2F0aW9uKTsvL29uIGlucHV0IGNoYW5nZSBldmVudHMsIGNvbnZlcnQgc3RyaW5nIHRvIG51bWJlci4uLmdydW1ibGUuXG5cbiAgICAvLyBwcmV2ZW50IHNsaWRlciBmcm9tIHJ1bm5pbmcgb3V0IG9mIGJvdW5kcywgaWYgdmFsdWUgZXhjZWVkcyB0aGUgbGltaXRzIHNldCB0aHJvdWdoIG9wdGlvbnMsIG92ZXJyaWRlIHRoZSB2YWx1ZSB0byBtaW4vbWF4XG4gICAgaWYgKGxvY2F0aW9uIDwgdGhpcy5vcHRpb25zLnN0YXJ0KSB7IGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLnN0YXJ0OyB9XG4gICAgZWxzZSBpZiAobG9jYXRpb24gPiB0aGlzLm9wdGlvbnMuZW5kKSB7IGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLmVuZDsgfVxuXG4gICAgdmFyIGlzRGJsID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkO1xuXG4gICAgaWYgKGlzRGJsKSB7IC8vdGhpcyBibG9jayBpcyB0byBwcmV2ZW50IDIgaGFuZGxlcyBmcm9tIGNyb3NzaW5nIGVhY2hvdGhlci4gQ291bGQvc2hvdWxkIGJlIGltcHJvdmVkLlxuICAgICAgaWYgKHRoaXMuaGFuZGxlcy5pbmRleCgkaG5kbCkgPT09IDApIHtcbiAgICAgICAgdmFyIGgyVmFsID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUyLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgICAgIGxvY2F0aW9uID0gbG9jYXRpb24gPj0gaDJWYWwgPyBoMlZhbCAtIHRoaXMub3B0aW9ucy5zdGVwIDogbG9jYXRpb247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaDFWYWwgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZS5hdHRyKCdhcmlhLXZhbHVlbm93JykpO1xuICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uIDw9IGgxVmFsID8gaDFWYWwgKyB0aGlzLm9wdGlvbnMuc3RlcCA6IGxvY2F0aW9uO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vdGhpcyBpcyBmb3Igc2luZ2xlLWhhbmRsZWQgdmVydGljYWwgc2xpZGVycywgaXQgYWRqdXN0cyB0aGUgdmFsdWUgdG8gYWNjb3VudCBmb3IgdGhlIHNsaWRlciBiZWluZyBcInVwc2lkZS1kb3duXCJcbiAgICAvL2ZvciBjbGljayBhbmQgZHJhZyBldmVudHMsIGl0J3Mgd2VpcmQgZHVlIHRvIHRoZSBzY2FsZSgtMSwgMSkgY3NzIHByb3BlcnR5XG4gICAgaWYgKHRoaXMub3B0aW9ucy52ZXJ0aWNhbCAmJiAhbm9JbnZlcnQpIHtcbiAgICAgIGxvY2F0aW9uID0gdGhpcy5vcHRpb25zLmVuZCAtIGxvY2F0aW9uO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHZlcnQgPSB0aGlzLm9wdGlvbnMudmVydGljYWwsXG4gICAgICAgIGhPclcgPSB2ZXJ0ID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBsT3JUID0gdmVydCA/ICd0b3AnIDogJ2xlZnQnLFxuICAgICAgICBoYW5kbGVEaW0gPSAkaG5kbFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtoT3JXXSxcbiAgICAgICAgZWxlbURpbSA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbaE9yV10sXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgbWluL21heCB2YWx1ZSBiYXNlZCBvbiBjbGljayBvciBkcmFnIHBvaW50XG4gICAgICAgIHBjdE9mQmFyID0gdGhpcy5fcGN0T2ZCYXIobG9jYXRpb24pLFxuICAgICAgICAvL251bWJlciBvZiBhY3R1YWwgcGl4ZWxzIHRvIHNoaWZ0IHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIG9idGFpbmVkIGFib3ZlXG4gICAgICAgIHB4VG9Nb3ZlID0gKGVsZW1EaW0gLSBoYW5kbGVEaW0pICogcGN0T2ZCYXIsXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgdG8gc2hpZnQgdGhlIGhhbmRsZVxuICAgICAgICBtb3ZlbWVudCA9IChwZXJjZW50KHB4VG9Nb3ZlLCBlbGVtRGltKSAqIDEwMCkudG9GaXhlZCh0aGlzLm9wdGlvbnMuZGVjaW1hbCk7XG4gICAgICAgIC8vZml4aW5nIHRoZSBkZWNpbWFsIHZhbHVlIGZvciB0aGUgbG9jYXRpb24gbnVtYmVyLCBpcyBwYXNzZWQgdG8gb3RoZXIgbWV0aG9kcyBhcyBhIGZpeGVkIGZsb2F0aW5nLXBvaW50IHZhbHVlXG4gICAgICAgIGxvY2F0aW9uID0gcGFyc2VGbG9hdChsb2NhdGlvbi50b0ZpeGVkKHRoaXMub3B0aW9ucy5kZWNpbWFsKSk7XG4gICAgICAgIC8vIGRlY2xhcmUgZW1wdHkgb2JqZWN0IGZvciBjc3MgYWRqdXN0bWVudHMsIG9ubHkgdXNlZCB3aXRoIDIgaGFuZGxlZC1zbGlkZXJzXG4gICAgdmFyIGNzcyA9IHt9O1xuXG4gICAgdGhpcy5fc2V0VmFsdWVzKCRobmRsLCBsb2NhdGlvbik7XG5cbiAgICAvLyBUT0RPIHVwZGF0ZSB0byBjYWxjdWxhdGUgYmFzZWQgb24gdmFsdWVzIHNldCB0byByZXNwZWN0aXZlIGlucHV0cz8/XG4gICAgaWYgKGlzRGJsKSB7XG4gICAgICB2YXIgaXNMZWZ0SG5kbCA9IHRoaXMuaGFuZGxlcy5pbmRleCgkaG5kbCkgPT09IDAsXG4gICAgICAgICAgLy9lbXB0eSB2YXJpYWJsZSwgd2lsbCBiZSB1c2VkIGZvciBtaW4taGVpZ2h0L3dpZHRoIGZvciBmaWxsIGJhclxuICAgICAgICAgIGRpbSxcbiAgICAgICAgICAvL3BlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgY29tcGFyZWQgdG8gdGhlIHNsaWRlciBiYXJcbiAgICAgICAgICBoYW5kbGVQY3QgPSAgfn4ocGVyY2VudChoYW5kbGVEaW0sIGVsZW1EaW0pICogMTAwKTtcbiAgICAgIC8vaWYgbGVmdCBoYW5kbGUsIHRoZSBtYXRoIGlzIHNsaWdodGx5IGRpZmZlcmVudCB0aGFuIGlmIGl0J3MgdGhlIHJpZ2h0IGhhbmRsZSwgYW5kIHRoZSBsZWZ0L3RvcCBwcm9wZXJ0eSBuZWVkcyB0byBiZSBjaGFuZ2VkIGZvciB0aGUgZmlsbCBiYXJcbiAgICAgIGlmIChpc0xlZnRIbmRsKSB7XG4gICAgICAgIC8vbGVmdCBvciB0b3AgcGVyY2VudGFnZSB2YWx1ZSB0byBhcHBseSB0byB0aGUgZmlsbCBiYXIuXG4gICAgICAgIGNzc1tsT3JUXSA9IGAke21vdmVtZW50fSVgO1xuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgbmV3IG1pbi1oZWlnaHQvd2lkdGggZm9yIHRoZSBmaWxsIGJhci5cbiAgICAgICAgZGltID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUyWzBdLnN0eWxlW2xPclRdKSAtIG1vdmVtZW50ICsgaGFuZGxlUGN0O1xuICAgICAgICAvL3RoaXMgY2FsbGJhY2sgaXMgbmVjZXNzYXJ5IHRvIHByZXZlbnQgZXJyb3JzIGFuZCBhbGxvdyB0aGUgcHJvcGVyIHBsYWNlbWVudCBhbmQgaW5pdGlhbGl6YXRpb24gb2YgYSAyLWhhbmRsZWQgc2xpZGVyXG4gICAgICAgIC8vcGx1cywgaXQgbWVhbnMgd2UgZG9uJ3QgY2FyZSBpZiAnZGltJyBpc05hTiBvbiBpbml0LCBpdCB3b24ndCBiZSBpbiB0aGUgZnV0dXJlLlxuICAgICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH0vL3RoaXMgaXMgb25seSBuZWVkZWQgZm9yIHRoZSBpbml0aWFsaXphdGlvbiBvZiAyIGhhbmRsZWQgc2xpZGVyc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9qdXN0IGNhY2hpbmcgdGhlIHZhbHVlIG9mIHRoZSBsZWZ0L2JvdHRvbSBoYW5kbGUncyBsZWZ0L3RvcCBwcm9wZXJ0eVxuICAgICAgICB2YXIgaGFuZGxlUG9zID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGVbMF0uc3R5bGVbbE9yVF0pO1xuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgbmV3IG1pbi1oZWlnaHQvd2lkdGggZm9yIHRoZSBmaWxsIGJhci4gVXNlIGlzTmFOIHRvIHByZXZlbnQgZmFsc2UgcG9zaXRpdmVzIGZvciBudW1iZXJzIDw9IDBcbiAgICAgICAgLy9iYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBvZiBtb3ZlbWVudCBvZiB0aGUgaGFuZGxlIGJlaW5nIG1hbmlwdWxhdGVkLCBsZXNzIHRoZSBvcHBvc2luZyBoYW5kbGUncyBsZWZ0L3RvcCBwb3NpdGlvbiwgcGx1cyB0aGUgcGVyY2VudGFnZSB3L2ggb2YgdGhlIGhhbmRsZSBpdHNlbGZcbiAgICAgICAgZGltID0gbW92ZW1lbnQgLSAoaXNOYU4oaGFuZGxlUG9zKSA/ICh0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IC0gdGhpcy5vcHRpb25zLnN0YXJ0KS8oKHRoaXMub3B0aW9ucy5lbmQtdGhpcy5vcHRpb25zLnN0YXJ0KS8xMDApIDogaGFuZGxlUG9zKSArIGhhbmRsZVBjdDtcbiAgICAgIH1cbiAgICAgIC8vIGFzc2lnbiB0aGUgbWluLWhlaWdodC93aWR0aCB0byBvdXIgY3NzIG9iamVjdFxuICAgICAgY3NzW2BtaW4tJHtoT3JXfWBdID0gYCR7ZGltfSVgO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub25lKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBoYW5kbGUgaXMgZG9uZSBtb3ZpbmcuXG4gICAgICAgICAgICAgICAgICAgICAqIEBldmVudCBTbGlkZXIjbW92ZWRcbiAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ21vdmVkLnpmLnNsaWRlcicsIFskaG5kbF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgLy9iZWNhdXNlIHdlIGRvbid0IGtub3cgZXhhY3RseSBob3cgdGhlIGhhbmRsZSB3aWxsIGJlIG1vdmVkLCBjaGVjayB0aGUgYW1vdW50IG9mIHRpbWUgaXQgc2hvdWxkIHRha2UgdG8gbW92ZS5cbiAgICB2YXIgbW92ZVRpbWUgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJykgPyAxMDAwLzYwIDogdGhpcy5vcHRpb25zLm1vdmVUaW1lO1xuXG4gICAgRm91bmRhdGlvbi5Nb3ZlKG1vdmVUaW1lLCAkaG5kbCwgZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhZGp1c3RpbmcgdGhlIGxlZnQvdG9wIHByb3BlcnR5IG9mIHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIGNhbGN1bGF0ZWQgYWJvdmVcbiAgICAgIC8vIGlmIG1vdmVtZW50IGlzTmFOLCB0aGF0IGlzIGJlY2F1c2UgdGhlIHNsaWRlciBpcyBoaWRkZW4gYW5kIHdlIGNhbm5vdCBkZXRlcm1pbmUgaGFuZGxlIHdpZHRoLFxuICAgICAgLy8gZmFsbCBiYWNrIHRvIG5leHQgYmVzdCBndWVzcy5cbiAgICAgIGlmIChpc05hTihtb3ZlbWVudCkpIHtcbiAgICAgICAgJGhuZGwuY3NzKGxPclQsIGAke3BjdE9mQmFyICogMTAwfSVgKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAkaG5kbC5jc3MobE9yVCwgYCR7bW92ZW1lbnR9JWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIV90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQpIHtcbiAgICAgICAgLy9pZiBzaW5nbGUtaGFuZGxlZCwgYSBzaW1wbGUgbWV0aG9kIHRvIGV4cGFuZCB0aGUgZmlsbCBiYXJcbiAgICAgICAgX3RoaXMuJGZpbGwuY3NzKGhPclcsIGAke3BjdE9mQmFyICogMTAwfSVgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vb3RoZXJ3aXNlLCB1c2UgdGhlIGNzcyBvYmplY3Qgd2UgY3JlYXRlZCBhYm92ZVxuICAgICAgICBfdGhpcy4kZmlsbC5jc3MoY3NzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdmFsdWUgaGFzIG5vdCBiZWVuIGNoYW5nZSBmb3IgYSBnaXZlbiB0aW1lLlxuICAgICAqIEBldmVudCBTbGlkZXIjY2hhbmdlZFxuICAgICAqL1xuICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2hhbmdlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICB9LCBfdGhpcy5vcHRpb25zLmNoYW5nZWREZWxheSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5pdGlhbCBhdHRyaWJ1dGUgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSBpbmRleCBvZiB0aGUgY3VycmVudCBoYW5kbGUvaW5wdXQgdG8gdXNlLlxuICAgKi9cbiAgX3NldEluaXRBdHRyKGlkeCkge1xuICAgIHZhciBpbml0VmFsID0gKGlkeCA9PT0gMCA/IHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQgOiB0aGlzLm9wdGlvbnMuaW5pdGlhbEVuZClcbiAgICB2YXIgaWQgPSB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoJ2lkJykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnc2xpZGVyJyk7XG4gICAgdGhpcy5pbnB1dHMuZXEoaWR4KS5hdHRyKHtcbiAgICAgICdpZCc6IGlkLFxuICAgICAgJ21heCc6IHRoaXMub3B0aW9ucy5lbmQsXG4gICAgICAnbWluJzogdGhpcy5vcHRpb25zLnN0YXJ0LFxuICAgICAgJ3N0ZXAnOiB0aGlzLm9wdGlvbnMuc3RlcFxuICAgIH0pO1xuICAgIHRoaXMuaW5wdXRzLmVxKGlkeCkudmFsKGluaXRWYWwpO1xuICAgIHRoaXMuaGFuZGxlcy5lcShpZHgpLmF0dHIoe1xuICAgICAgJ3JvbGUnOiAnc2xpZGVyJyxcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXG4gICAgICAnYXJpYS12YWx1ZW1heCc6IHRoaXMub3B0aW9ucy5lbmQsXG4gICAgICAnYXJpYS12YWx1ZW1pbic6IHRoaXMub3B0aW9ucy5zdGFydCxcbiAgICAgICdhcmlhLXZhbHVlbm93JzogaW5pdFZhbCxcbiAgICAgICdhcmlhLW9yaWVudGF0aW9uJzogdGhpcy5vcHRpb25zLnZlcnRpY2FsID8gJ3ZlcnRpY2FsJyA6ICdob3Jpem9udGFsJyxcbiAgICAgICd0YWJpbmRleCc6IDBcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBpbnB1dCBhbmQgYGFyaWEtdmFsdWVub3dgIHZhbHVlcyBmb3IgdGhlIHNsaWRlciBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgY3VycmVudGx5IHNlbGVjdGVkIGhhbmRsZS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbCAtIGZsb2F0aW5nIHBvaW50IG9mIHRoZSBuZXcgdmFsdWUuXG4gICAqL1xuICBfc2V0VmFsdWVzKCRoYW5kbGUsIHZhbCkge1xuICAgIHZhciBpZHggPSB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPyB0aGlzLmhhbmRsZXMuaW5kZXgoJGhhbmRsZSkgOiAwO1xuICAgIHRoaXMuaW5wdXRzLmVxKGlkeCkudmFsKHZhbCk7XG4gICAgJGhhbmRsZS5hdHRyKCdhcmlhLXZhbHVlbm93JywgdmFsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGV2ZW50cyBvbiB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAqIENhbGN1bGF0ZXMgdGhlIG5ldyBsb2NhdGlvbiBvZiB0aGUgY3VycmVudCBoYW5kbGUuXG4gICAqIElmIHRoZXJlIGFyZSB0d28gaGFuZGxlcyBhbmQgdGhlIGJhciB3YXMgY2xpY2tlZCwgaXQgZGV0ZXJtaW5lcyB3aGljaCBoYW5kbGUgdG8gbW92ZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlIC0gdGhlIGBldmVudGAgb2JqZWN0IHBhc3NlZCBmcm9tIHRoZSBsaXN0ZW5lci5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgY3VycmVudCBoYW5kbGUgdG8gY2FsY3VsYXRlIGZvciwgaWYgc2VsZWN0ZWQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgLSBmbG9hdGluZyBwb2ludCBudW1iZXIgZm9yIHRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlci5cbiAgICogVE9ETyBjbGVhbiB0aGlzIHVwLCB0aGVyZSdzIGEgbG90IG9mIHJlcGVhdGVkIGNvZGUgYmV0d2VlbiB0aGlzIGFuZCB0aGUgX3NldEhhbmRsZVBvcyBmbi5cbiAgICovXG4gIF9oYW5kbGVFdmVudChlLCAkaGFuZGxlLCB2YWwpIHtcbiAgICB2YXIgdmFsdWUsIGhhc1ZhbDtcbiAgICBpZiAoIXZhbCkgey8vY2xpY2sgb3IgZHJhZyBldmVudHNcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgICAgdmVydGljYWwgPSB0aGlzLm9wdGlvbnMudmVydGljYWwsXG4gICAgICAgICAgcGFyYW0gPSB2ZXJ0aWNhbCA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgICBkaXJlY3Rpb24gPSB2ZXJ0aWNhbCA/ICd0b3AnIDogJ2xlZnQnLFxuICAgICAgICAgIGV2ZW50T2Zmc2V0ID0gdmVydGljYWwgPyBlLnBhZ2VZIDogZS5wYWdlWCxcbiAgICAgICAgICBoYWxmT2ZIYW5kbGUgPSB0aGlzLiRoYW5kbGVbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbcGFyYW1dIC8gMixcbiAgICAgICAgICBiYXJEaW0gPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW3BhcmFtXSxcbiAgICAgICAgICB3aW5kb3dTY3JvbGwgPSB2ZXJ0aWNhbCA/ICQod2luZG93KS5zY3JvbGxUb3AoKSA6ICQod2luZG93KS5zY3JvbGxMZWZ0KCk7XG5cblxuICAgICAgdmFyIGVsZW1PZmZzZXQgPSB0aGlzLiRlbGVtZW50Lm9mZnNldCgpW2RpcmVjdGlvbl07XG5cbiAgICAgIC8vIHRvdWNoIGV2ZW50cyBlbXVsYXRlZCBieSB0aGUgdG91Y2ggdXRpbCBnaXZlIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHNjcmVlbiwgYWRkIHdpbmRvdy5zY3JvbGwgdG8gZXZlbnQgY29vcmRpbmF0ZXMuLi5cbiAgICAgIC8vIGJlc3Qgd2F5IHRvIGd1ZXNzIHRoaXMgaXMgc2ltdWxhdGVkIGlzIGlmIGNsaWVudFkgPT0gcGFnZVlcbiAgICAgIGlmIChlLmNsaWVudFkgPT09IGUucGFnZVkpIHsgZXZlbnRPZmZzZXQgPSBldmVudE9mZnNldCArIHdpbmRvd1Njcm9sbDsgfVxuICAgICAgdmFyIGV2ZW50RnJvbUJhciA9IGV2ZW50T2Zmc2V0IC0gZWxlbU9mZnNldDtcbiAgICAgIHZhciBiYXJYWTtcbiAgICAgIGlmIChldmVudEZyb21CYXIgPCAwKSB7XG4gICAgICAgIGJhclhZID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnRGcm9tQmFyID4gYmFyRGltKSB7XG4gICAgICAgIGJhclhZID0gYmFyRGltO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFyWFkgPSBldmVudEZyb21CYXI7XG4gICAgICB9XG4gICAgICB2YXIgb2Zmc2V0UGN0ID0gcGVyY2VudChiYXJYWSwgYmFyRGltKTtcblxuICAgICAgdmFsdWUgPSB0aGlzLl92YWx1ZShvZmZzZXRQY3QpO1xuXG4gICAgICAvLyB0dXJuIGV2ZXJ5dGhpbmcgYXJvdW5kIGZvciBSVEwsIHlheSBtYXRoIVxuICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkgJiYgIXRoaXMub3B0aW9ucy52ZXJ0aWNhbCkge3ZhbHVlID0gdGhpcy5vcHRpb25zLmVuZCAtIHZhbHVlO31cblxuICAgICAgdmFsdWUgPSBfdGhpcy5fYWRqdXN0VmFsdWUobnVsbCwgdmFsdWUpO1xuICAgICAgLy9ib29sZWFuIGZsYWcgZm9yIHRoZSBzZXRIYW5kbGVQb3MgZm4sIHNwZWNpZmljYWxseSBmb3IgdmVydGljYWwgc2xpZGVyc1xuICAgICAgaGFzVmFsID0gZmFsc2U7XG5cbiAgICAgIGlmICghJGhhbmRsZSkgey8vZmlndXJlIG91dCB3aGljaCBoYW5kbGUgaXQgaXMsIHBhc3MgaXQgdG8gdGhlIG5leHQgZnVuY3Rpb24uXG4gICAgICAgIHZhciBmaXJzdEhuZGxQb3MgPSBhYnNQb3NpdGlvbih0aGlzLiRoYW5kbGUsIGRpcmVjdGlvbiwgYmFyWFksIHBhcmFtKSxcbiAgICAgICAgICAgIHNlY25kSG5kbFBvcyA9IGFic1Bvc2l0aW9uKHRoaXMuJGhhbmRsZTIsIGRpcmVjdGlvbiwgYmFyWFksIHBhcmFtKTtcbiAgICAgICAgICAgICRoYW5kbGUgPSBmaXJzdEhuZGxQb3MgPD0gc2VjbmRIbmRsUG9zID8gdGhpcy4kaGFuZGxlIDogdGhpcy4kaGFuZGxlMjtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7Ly9jaGFuZ2UgZXZlbnQgb24gaW5wdXRcbiAgICAgIHZhbHVlID0gdGhpcy5fYWRqdXN0VmFsdWUobnVsbCwgdmFsKTtcbiAgICAgIGhhc1ZhbCA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2V0SGFuZGxlUG9zKCRoYW5kbGUsIHZhbHVlLCBoYXNWYWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdGVzIHZhbHVlIGZvciBoYW5kbGUgaW4gcmVnYXJkIHRvIHN0ZXAgdmFsdWUuIHJldHVybnMgYWRqdXN0ZWQgdmFsdWVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIHNlbGVjdGVkIGhhbmRsZS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIC0gdmFsdWUgdG8gYWRqdXN0LiB1c2VkIGlmICRoYW5kbGUgaXMgZmFsc3lcbiAgICovXG4gIF9hZGp1c3RWYWx1ZSgkaGFuZGxlLCB2YWx1ZSkge1xuICAgIHZhciB2YWwsXG4gICAgICBzdGVwID0gdGhpcy5vcHRpb25zLnN0ZXAsXG4gICAgICBkaXYgPSBwYXJzZUZsb2F0KHN0ZXAvMiksXG4gICAgICBsZWZ0LCBwcmV2X3ZhbCwgbmV4dF92YWw7XG4gICAgaWYgKCEhJGhhbmRsZSkge1xuICAgICAgdmFsID0gcGFyc2VGbG9hdCgkaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFsID0gdmFsdWU7XG4gICAgfVxuICAgIGxlZnQgPSB2YWwgJSBzdGVwO1xuICAgIHByZXZfdmFsID0gdmFsIC0gbGVmdDtcbiAgICBuZXh0X3ZhbCA9IHByZXZfdmFsICsgc3RlcDtcbiAgICBpZiAobGVmdCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG4gICAgdmFsID0gdmFsID49IHByZXZfdmFsICsgZGl2ID8gbmV4dF92YWwgOiBwcmV2X3ZhbDtcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBzbGlkZXIgZWxlbWVudHMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLl9ldmVudHNGb3JIYW5kbGUodGhpcy4kaGFuZGxlKTtcbiAgICBpZih0aGlzLmhhbmRsZXNbMV0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c0ZvckhhbmRsZSh0aGlzLiRoYW5kbGUyKTtcbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyBhIHBhcnRpY3VsYXIgaGFuZGxlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50IGhhbmRsZSB0byBhcHBseSBsaXN0ZW5lcnMgdG8uXG4gICAqL1xuICBfZXZlbnRzRm9ySGFuZGxlKCRoYW5kbGUpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBjdXJIYW5kbGUsXG4gICAgICAgIHRpbWVyO1xuXG4gICAgICB0aGlzLmlucHV0cy5vZmYoJ2NoYW5nZS56Zi5zbGlkZXInKS5vbignY2hhbmdlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGlkeCA9IF90aGlzLmlucHV0cy5pbmRleCgkKHRoaXMpKTtcbiAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIF90aGlzLmhhbmRsZXMuZXEoaWR4KSwgJCh0aGlzKS52YWwoKSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja1NlbGVjdCkge1xuICAgICAgICB0aGlzLiRlbGVtZW50Lm9mZignY2xpY2suemYuc2xpZGVyJykub24oJ2NsaWNrLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgICAgICAgIGlmICghJChlLnRhcmdldCkuaXMoJ1tkYXRhLXNsaWRlci1oYW5kbGVdJykpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkKSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBfdGhpcy4kaGFuZGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGUpIHtcbiAgICAgIHRoaXMuaGFuZGxlcy5hZGRUb3VjaCgpO1xuXG4gICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAkaGFuZGxlXG4gICAgICAgIC5vZmYoJ21vdXNlZG93bi56Zi5zbGlkZXInKVxuICAgICAgICAub24oJ21vdXNlZG93bi56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgJGhhbmRsZS5hZGRDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICBfdGhpcy4kZmlsbC5hZGRDbGFzcygnaXMtZHJhZ2dpbmcnKTsvL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgdHJ1ZSk7XG5cbiAgICAgICAgICBjdXJIYW5kbGUgPSAkKGUuY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgICAkYm9keS5vbignbW91c2Vtb3ZlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBjdXJIYW5kbGUpO1xuXG4gICAgICAgICAgfSkub24oJ21vdXNldXAuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIGN1ckhhbmRsZSk7XG5cbiAgICAgICAgICAgICRoYW5kbGUucmVtb3ZlQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICBfdGhpcy4kZmlsbC5yZW1vdmVDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgZmFsc2UpO1xuXG4gICAgICAgICAgICAkYm9keS5vZmYoJ21vdXNlbW92ZS56Zi5zbGlkZXIgbW91c2V1cC56Zi5zbGlkZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICAvLyBwcmV2ZW50IGV2ZW50cyB0cmlnZ2VyZWQgYnkgdG91Y2hcbiAgICAgIC5vbignc2VsZWN0c3RhcnQuemYuc2xpZGVyIHRvdWNobW92ZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgICRoYW5kbGUub2ZmKCdrZXlkb3duLnpmLnNsaWRlcicpLm9uKCdrZXlkb3duLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBfJGhhbmRsZSA9ICQodGhpcyksXG4gICAgICAgICAgaWR4ID0gX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCA/IF90aGlzLmhhbmRsZXMuaW5kZXgoXyRoYW5kbGUpIDogMCxcbiAgICAgICAgICBvbGRWYWx1ZSA9IHBhcnNlRmxvYXQoX3RoaXMuaW5wdXRzLmVxKGlkeCkudmFsKCkpLFxuICAgICAgICAgIG5ld1ZhbHVlO1xuXG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnU2xpZGVyJywge1xuICAgICAgICBkZWNyZWFzZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSAtIF90aGlzLm9wdGlvbnMuc3RlcDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgKyBfdGhpcy5vcHRpb25zLnN0ZXA7XG4gICAgICAgIH0sXG4gICAgICAgIGRlY3JlYXNlX2Zhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgLSBfdGhpcy5vcHRpb25zLnN0ZXAgKiAxMDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2VfZmFzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSArIF90aGlzLm9wdGlvbnMuc3RlcCAqIDEwO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHsgLy8gb25seSBzZXQgaGFuZGxlIHBvcyB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkIHNwZWNpYWxseVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5fc2V0SGFuZGxlUG9zKF8kaGFuZGxlLCBuZXdWYWx1ZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLyppZiAobmV3VmFsdWUpIHsgLy8gaWYgcHJlc3NlZCBrZXkgaGFzIHNwZWNpYWwgZnVuY3Rpb24sIHVwZGF0ZSB2YWx1ZVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlKTtcbiAgICAgIH0qL1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBzbGlkZXIgcGx1Z2luLlxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmhhbmRsZXMub2ZmKCcuemYuc2xpZGVyJyk7XG4gICAgdGhpcy5pbnB1dHMub2ZmKCcuemYuc2xpZGVyJyk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5zbGlkZXInKTtcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblNsaWRlci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1pbmltdW0gdmFsdWUgZm9yIHRoZSBzbGlkZXIgc2NhbGUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMFxuICAgKi9cbiAgc3RhcnQ6IDAsXG4gIC8qKlxuICAgKiBNYXhpbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDEwMFxuICAgKi9cbiAgZW5kOiAxMDAsXG4gIC8qKlxuICAgKiBNaW5pbXVtIHZhbHVlIGNoYW5nZSBwZXIgY2hhbmdlIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIHN0ZXA6IDEsXG4gIC8qKlxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgaGFuZGxlL2lucHV0ICoobGVmdCBoYW5kbGUvZmlyc3QgaW5wdXQpKiBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDBcbiAgICovXG4gIGluaXRpYWxTdGFydDogMCxcbiAgLyoqXG4gICAqIFZhbHVlIGF0IHdoaWNoIHRoZSByaWdodCBoYW5kbGUvc2Vjb25kIGlucHV0IHNob3VsZCBiZSBzZXQgdG8gb24gaW5pdGlhbGl6YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMTAwXG4gICAqL1xuICBpbml0aWFsRW5kOiAxMDAsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIGlucHV0IHRvIGJlIGxvY2F0ZWQgb3V0c2lkZSB0aGUgY29udGFpbmVyIGFuZCB2aXNpYmxlLiBTZXQgdG8gYnkgdGhlIEpTXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBiaW5kaW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBjbGljay90YXAgb24gdGhlIHNsaWRlciBiYXIgdG8gc2VsZWN0IGEgdmFsdWUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGNsaWNrU2VsZWN0OiB0cnVlLFxuICAvKipcbiAgICogU2V0IHRvIHRydWUgYW5kIHVzZSB0aGUgYHZlcnRpY2FsYCBjbGFzcyB0byBjaGFuZ2UgYWxpZ25tZW50IHRvIHZlcnRpY2FsLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgdmVydGljYWw6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB1c2VyIHRvIGRyYWcgdGhlIHNsaWRlciBoYW5kbGUocykgdG8gc2VsZWN0IGEgdmFsdWUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGRyYWdnYWJsZTogdHJ1ZSxcbiAgLyoqXG4gICAqIERpc2FibGVzIHRoZSBzbGlkZXIgYW5kIHByZXZlbnRzIGV2ZW50IGxpc3RlbmVycyBmcm9tIGJlaW5nIGFwcGxpZWQuIERvdWJsZSBjaGVja2VkIGJ5IEpTIHdpdGggYGRpc2FibGVkQ2xhc3NgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZGlzYWJsZWQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB1c2Ugb2YgdHdvIGhhbmRsZXMuIERvdWJsZSBjaGVja2VkIGJ5IHRoZSBKUy4gQ2hhbmdlcyBzb21lIGxvZ2ljIGhhbmRsaW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZG91YmxlU2lkZWQ6IGZhbHNlLFxuICAvKipcbiAgICogUG90ZW50aWFsIGZ1dHVyZSBmZWF0dXJlLlxuICAgKi9cbiAgLy8gc3RlcHM6IDEwMCxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlcyB0aGUgcGx1Z2luIHNob3VsZCBnbyB0byBmb3IgZmxvYXRpbmcgcG9pbnQgcHJlY2lzaW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDJcbiAgICovXG4gIGRlY2ltYWw6IDIsXG4gIC8qKlxuICAgKiBUaW1lIGRlbGF5IGZvciBkcmFnZ2VkIGVsZW1lbnRzLlxuICAgKi9cbiAgLy8gZHJhZ0RlbGF5OiAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGFuaW1hdGUgdGhlIG1vdmVtZW50IG9mIGEgc2xpZGVyIGhhbmRsZSBpZiB1c2VyIGNsaWNrcy90YXBzIG9uIHRoZSBiYXIuIE5lZWRzIHRvIGJlIG1hbnVhbGx5IHNldCBpZiB1cGRhdGluZyB0aGUgdHJhbnNpdGlvbiB0aW1lIGluIHRoZSBTYXNzIHNldHRpbmdzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDIwMFxuICAgKi9cbiAgbW92ZVRpbWU6IDIwMCwvL3VwZGF0ZSB0aGlzIGlmIGNoYW5naW5nIHRoZSB0cmFuc2l0aW9uIHRpbWUgaW4gdGhlIHNhc3NcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gZGlzYWJsZWQgc2xpZGVycy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnZGlzYWJsZWQnXG4gICAqL1xuICBkaXNhYmxlZENsYXNzOiAnZGlzYWJsZWQnLFxuICAvKipcbiAgICogV2lsbCBpbnZlcnQgdGhlIGRlZmF1bHQgbGF5b3V0IGZvciBhIHZlcnRpY2FsPHNwYW4gZGF0YS10b29sdGlwIHRpdGxlPVwid2hvIHdvdWxkIGRvIHRoaXM/Pz9cIj4gPC9zcGFuPnNsaWRlci5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGludmVydFZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIE1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIGBjaGFuZ2VkLnpmLXNsaWRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIGFmdGVyIHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCA1MDBcbiAgICovXG4gIGNoYW5nZWREZWxheTogNTAwLFxuICAvKipcbiAgKiBCYXNldmFsdWUgZm9yIG5vbi1saW5lYXIgc2xpZGVyc1xuICAqIEBvcHRpb25cbiAgKiBAdHlwZSB7bnVtYmVyfVxuICAqIEBkZWZhdWx0IDVcbiAgKi9cbiAgbm9uTGluZWFyQmFzZTogNSxcbiAgLyoqXG4gICogQmFzZXZhbHVlIGZvciBub24tbGluZWFyIHNsaWRlcnMsIHBvc3NpYmxlIHZhbHVlcyBhcmU6IGAnbGluZWFyJ2AsIGAncG93J2AgJiBgJ2xvZydgLiBQb3cgYW5kIExvZyB1c2UgdGhlIG5vbkxpbmVhckJhc2Ugc2V0dGluZy5cbiAgKiBAb3B0aW9uXG4gICogQHR5cGUge3N0cmluZ31cbiAgKiBAZGVmYXVsdCAnbGluZWFyJ1xuICAqL1xuICBwb3NpdGlvblZhbHVlRnVuY3Rpb246ICdsaW5lYXInLFxufTtcblxuZnVuY3Rpb24gcGVyY2VudChmcmFjLCBudW0pIHtcbiAgcmV0dXJuIChmcmFjIC8gbnVtKTtcbn1cbmZ1bmN0aW9uIGFic1Bvc2l0aW9uKCRoYW5kbGUsIGRpciwgY2xpY2tQb3MsIHBhcmFtKSB7XG4gIHJldHVybiBNYXRoLmFicygoJGhhbmRsZS5wb3NpdGlvbigpW2Rpcl0gKyAoJGhhbmRsZVtwYXJhbV0oKSAvIDIpKSAtIGNsaWNrUG9zKTtcbn1cbmZ1bmN0aW9uIGJhc2VMb2coYmFzZSwgdmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubG9nKHZhbHVlKS9NYXRoLmxvZyhiYXNlKVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU2xpZGVyLCAnU2xpZGVyJyk7XG5cbn0oalF1ZXJ5KTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFN0aWNreSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc3RpY2t5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBTdGlja3kge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHN0aWNreSB0aGluZy5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIHN0aWNreS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25zIG9iamVjdCBwYXNzZWQgd2hlbiBjcmVhdGluZyB0aGUgZWxlbWVudCBwcm9ncmFtbWF0aWNhbGx5LlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTdGlja3kuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1N0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBzdGlja3kgZWxlbWVudCBieSBhZGRpbmcgY2xhc3NlcywgZ2V0dGluZy9zZXR0aW5nIGRpbWVuc2lvbnMsIGJyZWFrcG9pbnRzIGFuZCBhdHRyaWJ1dGVzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyICRwYXJlbnQgPSB0aGlzLiRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3RpY2t5LWNvbnRhaW5lcl0nKSxcbiAgICAgICAgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3N0aWNreScpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoISRwYXJlbnQubGVuZ3RoKSB7XG4gICAgICB0aGlzLndhc1dyYXBwZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLiRjb250YWluZXIgPSAkcGFyZW50Lmxlbmd0aCA/ICRwYXJlbnQgOiAkKHRoaXMub3B0aW9ucy5jb250YWluZXIpLndyYXBJbm5lcih0aGlzLiRlbGVtZW50KTtcbiAgICB0aGlzLiRjb250YWluZXIuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnN0aWNreUNsYXNzKVxuICAgICAgICAgICAgICAgICAuYXR0cih7J2RhdGEtcmVzaXplJzogaWR9KTtcblxuICAgIHRoaXMuc2Nyb2xsQ291bnQgPSB0aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnN0aWNreScsIGZ1bmN0aW9uKCl7XG4gICAgICAvL1dlIGNhbGN1bGF0ZSB0aGUgY29udGFpbmVyIGhlaWdodCB0byBoYXZlIGNvcnJlY3QgdmFsdWVzIGZvciBhbmNob3IgcG9pbnRzIG9mZnNldCBjYWxjdWxhdGlvbi5cbiAgICAgIF90aGlzLmNvbnRhaW5lckhlaWdodCA9IF90aGlzLiRlbGVtZW50LmNzcyhcImRpc3BsYXlcIikgPT0gXCJub25lXCIgPyAwIDogX3RoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgX3RoaXMuJGNvbnRhaW5lci5jc3MoJ2hlaWdodCcsIF90aGlzLmNvbnRhaW5lckhlaWdodCk7XG4gICAgICBfdGhpcy5lbGVtSGVpZ2h0ID0gX3RoaXMuY29udGFpbmVySGVpZ2h0O1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5hbmNob3IgIT09ICcnKXtcbiAgICAgICAgX3RoaXMuJGFuY2hvciA9ICQoJyMnICsgX3RoaXMub3B0aW9ucy5hbmNob3IpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIF90aGlzLl9wYXJzZVBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHNjcm9sbCk7XG4gICAgICAgIC8vVW5zdGljayB0aGUgZWxlbWVudCB3aWxsIGVuc3VyZSB0aGF0IHByb3BlciBjbGFzc2VzIGFyZSBzZXQuXG4gICAgICAgIGlmICghX3RoaXMuaXNTdHVjaykge1xuICAgICAgICAgIF90aGlzLl9yZW1vdmVTdGlja3koKHNjcm9sbCA+PSBfdGhpcy50b3BQb2ludCkgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoaWQuc3BsaXQoJy0nKS5yZXZlcnNlKCkuam9pbignLScpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtdWx0aXBsZSBlbGVtZW50cyBhcyBhbmNob3JzLCBjYWxjdWxhdGVzIHRoZSB0b3AgYW5kIGJvdHRvbSBwaXhlbCB2YWx1ZXMgdGhlIHN0aWNreSB0aGluZyBzaG91bGQgc3RpY2sgYW5kIHVuc3RpY2sgb24uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhcnNlUG9pbnRzKCkge1xuICAgIHZhciB0b3AgPSB0aGlzLm9wdGlvbnMudG9wQW5jaG9yID09IFwiXCIgPyAxIDogdGhpcy5vcHRpb25zLnRvcEFuY2hvcixcbiAgICAgICAgYnRtID0gdGhpcy5vcHRpb25zLmJ0bUFuY2hvcj09IFwiXCIgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IDogdGhpcy5vcHRpb25zLmJ0bUFuY2hvcixcbiAgICAgICAgcHRzID0gW3RvcCwgYnRtXSxcbiAgICAgICAgYnJlYWtzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHB0cy5sZW5ndGg7IGkgPCBsZW4gJiYgcHRzW2ldOyBpKyspIHtcbiAgICAgIHZhciBwdDtcbiAgICAgIGlmICh0eXBlb2YgcHRzW2ldID09PSAnbnVtYmVyJykge1xuICAgICAgICBwdCA9IHB0c1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwbGFjZSA9IHB0c1tpXS5zcGxpdCgnOicpLFxuICAgICAgICAgICAgYW5jaG9yID0gJChgIyR7cGxhY2VbMF19YCk7XG5cbiAgICAgICAgcHQgPSBhbmNob3Iub2Zmc2V0KCkudG9wO1xuICAgICAgICBpZiAocGxhY2VbMV0gJiYgcGxhY2VbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICBwdCArPSBhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha3NbaV0gPSBwdDtcbiAgICB9XG5cblxuICAgIHRoaXMucG9pbnRzID0gYnJlYWtzO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgc2Nyb2xsaW5nIGVsZW1lbnQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAtIHBzdWVkby1yYW5kb20gaWQgZm9yIHVuaXF1ZSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIuXG4gICAqL1xuICBfZXZlbnRzKGlkKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc2Nyb2xsTGlzdGVuZXIgPSB0aGlzLnNjcm9sbExpc3RlbmVyID0gYHNjcm9sbC56Zi4ke2lkfWA7XG4gICAgaWYgKHRoaXMuaXNPbikgeyByZXR1cm47IH1cbiAgICBpZiAodGhpcy5jYW5TdGljaykge1xuICAgICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpXG4gICAgICAgICAgICAgICAub24oc2Nyb2xsTGlzdGVuZXIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNjcm9sbENvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQgPSBfdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpXG4gICAgICAgICAgICAgICAgIC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUsIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmNhblN0aWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fZXZlbnRzKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3RoaXMuaXNPbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9wYXVzZUxpc3RlbmVycyhzY3JvbGxMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgaGFuZGxlcnMgZm9yIHNjcm9sbCBhbmQgY2hhbmdlIGV2ZW50cyBvbiBhbmNob3IuXG4gICAqIEBmaXJlcyBTdGlja3kjcGF1c2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNjcm9sbExpc3RlbmVyIC0gdW5pcXVlLCBuYW1lc3BhY2VkIHNjcm9sbCBsaXN0ZW5lciBhdHRhY2hlZCB0byBgd2luZG93YFxuICAgKi9cbiAgX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKSB7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcik7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaXMgcGF1c2VkIGR1ZSB0byByZXNpemUgZXZlbnQgc2hyaW5raW5nIHRoZSB2aWV3LlxuICAgICAqIEBldmVudCBTdGlja3kjcGF1c2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3BhdXNlLnpmLnN0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBldmVyeSBgc2Nyb2xsYCBldmVudCBhbmQgb24gYF9pbml0YFxuICAgKiBmaXJlcyBmdW5jdGlvbnMgYmFzZWQgb24gYm9vbGVhbnMgYW5kIGNhY2hlZCB2YWx1ZXNcbiAgICogQHBhcmFtIHtCb29sZWFufSBjaGVja1NpemVzIC0gdHJ1ZSBpZiBwbHVnaW4gc2hvdWxkIHJlY2FsY3VsYXRlIHNpemVzIGFuZCBicmVha3BvaW50cy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHNjcm9sbCAtIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIHBhc3NlZCBmcm9tIHNjcm9sbCBldmVudCBjYiBmdW5jdGlvbi4gSWYgbm90IHBhc3NlZCwgZGVmYXVsdHMgdG8gYHdpbmRvdy5wYWdlWU9mZnNldGAuXG4gICAqL1xuICBfY2FsYyhjaGVja1NpemVzLCBzY3JvbGwpIHtcbiAgICBpZiAoY2hlY2tTaXplcykgeyB0aGlzLl9zZXRTaXplcygpOyB9XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghc2Nyb2xsKSB7IHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDsgfVxuXG4gICAgaWYgKHNjcm9sbCA+PSB0aGlzLnRvcFBvaW50KSB7XG4gICAgICBpZiAoc2Nyb2xsIDw9IHRoaXMuYm90dG9tUG9pbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgICB0aGlzLl9zZXRTdGlja3koKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreShmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHN0dWNrLlxuICAgKiBBZGRzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAZmlyZXMgU3RpY2t5I3N0dWNrdG9cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U3RpY2t5KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHN0aWNrVG8gPSB0aGlzLm9wdGlvbnMuc3RpY2tUbyxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ2JvdHRvbScgOiAndG9wJyxcbiAgICAgICAgY3NzID0ge307XG5cbiAgICBjc3NbbXJnbl0gPSBgJHt0aGlzLm9wdGlvbnNbbXJnbl19ZW1gO1xuICAgIGNzc1tzdGlja1RvXSA9IDA7XG4gICAgY3NzW25vdFN0dWNrVG9dID0gJ2F1dG8nO1xuICAgIHRoaXMuaXNTdHVjayA9IHRydWU7XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgaXMtYW5jaG9yZWQgaXMtYXQtJHtub3RTdHVja1RvfWApXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgaXMtc3R1Y2sgaXMtYXQtJHtzdGlja1RvfWApXG4gICAgICAgICAgICAgICAgIC5jc3MoY3NzKVxuICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgJGVsZW1lbnQgaGFzIGJlY29tZSBgcG9zaXRpb246IGZpeGVkO2BcbiAgICAgICAgICAgICAgICAgICogTmFtZXNwYWNlZCB0byBgdG9wYCBvciBgYm90dG9tYCwgZS5nLiBgc3RpY2t5LnpmLnN0dWNrdG86dG9wYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3N0dWNrdG9cbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYuc3R1Y2t0bzoke3N0aWNrVG99YCk7XG4gICAgdGhpcy4kZWxlbWVudC5vbihcInRyYW5zaXRpb25lbmQgd2Via2l0VHJhbnNpdGlvbkVuZCBvVHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBNU1RyYW5zaXRpb25FbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYXVzZXMgdGhlICRlbGVtZW50IHRvIGJlY29tZSB1bnN0dWNrLlxuICAgKiBSZW1vdmVzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBBZGRzIG90aGVyIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzVG9wIC0gdGVsbHMgdGhlIGZ1bmN0aW9uIGlmIHRoZSAkZWxlbWVudCBzaG91bGQgYW5jaG9yIHRvIHRoZSB0b3Agb3IgYm90dG9tIG9mIGl0cyAkYW5jaG9yIGVsZW1lbnQuXG4gICAqIEBmaXJlcyBTdGlja3kjdW5zdHVja2Zyb21cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZW1vdmVTdGlja3koaXNUb3ApIHtcbiAgICB2YXIgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBzdGlja1RvVG9wID0gc3RpY2tUbyA9PT0gJ3RvcCcsXG4gICAgICAgIGNzcyA9IHt9LFxuICAgICAgICBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy5wb2ludHNbMF0gOiB0aGlzLmFuY2hvckhlaWdodCkgLSB0aGlzLmVsZW1IZWlnaHQsXG4gICAgICAgIG1yZ24gPSBzdGlja1RvVG9wID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG9Ub3AgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICB0b3BPckJvdHRvbSA9IGlzVG9wID8gJ3RvcCcgOiAnYm90dG9tJztcblxuICAgIGNzc1ttcmduXSA9IDA7XG5cbiAgICBjc3NbJ2JvdHRvbSddID0gJ2F1dG8nO1xuICAgIGlmKGlzVG9wKSB7XG4gICAgICBjc3NbJ3RvcCddID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3NzWyd0b3AnXSA9IGFuY2hvclB0O1xuICAgIH1cblxuICAgIHRoaXMuaXNTdHVjayA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7dG9wT3JCb3R0b219YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGFuY2hvcmVkLlxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYudW5zdHVja2Zyb206Ym90dG9tYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3Vuc3R1Y2tmcm9tXG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAudHJpZ2dlcihgc3RpY2t5LnpmLnVuc3R1Y2tmcm9tOiR7dG9wT3JCb3R0b219YCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgJGVsZW1lbnQgYW5kICRjb250YWluZXIgc2l6ZXMgZm9yIHBsdWdpbi5cbiAgICogQ2FsbHMgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uIG9mIGBfc2V0QnJlYWtQb2ludHNgLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFNpemVzKGNiKSB7XG4gICAgdGhpcy5jYW5TdGljayA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5pcyh0aGlzLm9wdGlvbnMuc3RpY2t5T24pO1xuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfVxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIG5ld0VsZW1XaWR0aCA9IHRoaXMuJGNvbnRhaW5lclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aCxcbiAgICAgICAgY29tcCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuJGNvbnRhaW5lclswXSksXG4gICAgICAgIHBkbmdsID0gcGFyc2VJbnQoY29tcFsncGFkZGluZy1sZWZ0J10sIDEwKSxcbiAgICAgICAgcGRuZ3IgPSBwYXJzZUludChjb21wWydwYWRkaW5nLXJpZ2h0J10sIDEwKTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy5hbmNob3JIZWlnaHQgPSB0aGlzLiRhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wYXJzZVBvaW50cygpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcbiAgICAgICdtYXgtd2lkdGgnOiBgJHtuZXdFbGVtV2lkdGggLSBwZG5nbCAtIHBkbmdyfXB4YFxuICAgIH0pO1xuXG4gICAgdmFyIG5ld0NvbnRhaW5lckhlaWdodCA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0IHx8IHRoaXMuY29udGFpbmVySGVpZ2h0O1xuICAgIGlmICh0aGlzLiRlbGVtZW50LmNzcyhcImRpc3BsYXlcIikgPT0gXCJub25lXCIpIHtcbiAgICAgIG5ld0NvbnRhaW5lckhlaWdodCA9IDA7XG4gICAgfVxuICAgIHRoaXMuY29udGFpbmVySGVpZ2h0ID0gbmV3Q29udGFpbmVySGVpZ2h0O1xuICAgIHRoaXMuJGNvbnRhaW5lci5jc3Moe1xuICAgICAgaGVpZ2h0OiBuZXdDb250YWluZXJIZWlnaHRcbiAgICB9KTtcbiAgICB0aGlzLmVsZW1IZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG5cbiAgICBpZiAoIXRoaXMuaXNTdHVjaykge1xuICAgICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLWF0LWJvdHRvbScpKSB7XG4gICAgICAgIHZhciBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy4kY29udGFpbmVyLm9mZnNldCgpLnRvcCA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodDtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5jc3MoJ3RvcCcsIGFuY2hvclB0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zZXRCcmVha1BvaW50cyhuZXdDb250YWluZXJIZWlnaHQsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdXBwZXIgYW5kIGxvd2VyIGJyZWFrcG9pbnRzIGZvciB0aGUgZWxlbWVudCB0byBiZWNvbWUgc3RpY2t5L3Vuc3RpY2t5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZWxlbUhlaWdodCAtIHB4IHZhbHVlIGZvciBzdGlja3kuJGVsZW1lbnQgaGVpZ2h0LCBjYWxjdWxhdGVkIGJ5IGBfc2V0U2l6ZXNgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBjb21wbGV0aW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldEJyZWFrUG9pbnRzKGVsZW1IZWlnaHQsIGNiKSB7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICAgIGVsc2UgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgdmFyIG1Ub3AgPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpblRvcCksXG4gICAgICAgIG1CdG0gPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpbkJvdHRvbSksXG4gICAgICAgIHRvcFBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1swXSA6IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AsXG4gICAgICAgIGJvdHRvbVBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1sxXSA6IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQsXG4gICAgICAgIC8vIHRvcFBvaW50ID0gdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCB8fCB0aGlzLnBvaW50c1swXSxcbiAgICAgICAgLy8gYm90dG9tUG9pbnQgPSB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0IHx8IHRoaXMucG9pbnRzWzFdLFxuICAgICAgICB3aW5IZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICd0b3AnKSB7XG4gICAgICB0b3BQb2ludCAtPSBtVG9wO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKGVsZW1IZWlnaHQgKyBtVG9wKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAnYm90dG9tJykge1xuICAgICAgdG9wUG9pbnQgLT0gKHdpbkhlaWdodCAtIChlbGVtSGVpZ2h0ICsgbUJ0bSkpO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKHdpbkhlaWdodCAtIG1CdG0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvL3RoaXMgd291bGQgYmUgdGhlIHN0aWNrVG86IGJvdGggb3B0aW9uLi4uIHRyaWNreVxuICAgIH1cblxuICAgIHRoaXMudG9wUG9pbnQgPSB0b3BQb2ludDtcbiAgICB0aGlzLmJvdHRvbVBvaW50ID0gYm90dG9tUG9pbnQ7XG5cbiAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgY3VycmVudCBzdGlja3kgZWxlbWVudC5cbiAgICogUmVzZXRzIHRoZSBlbGVtZW50IHRvIHRoZSB0b3AgcG9zaXRpb24gZmlyc3QuXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzLCBKUy1hZGRlZCBjc3MgcHJvcGVydGllcyBhbmQgY2xhc3NlcywgYW5kIHVud3JhcHMgdGhlICRlbGVtZW50IGlmIHRoZSBKUyBhZGRlZCB0aGUgJGNvbnRhaW5lci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcblxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnN0aWNreUNsYXNzfSBpcy1hbmNob3JlZCBpcy1hdC10b3BgKVxuICAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnLFxuICAgICAgICAgICAgICAgICAgIHRvcDogJycsXG4gICAgICAgICAgICAgICAgICAgYm90dG9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAnbWF4LXdpZHRoJzogJydcbiAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgLm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignY2hhbmdlLnpmLnN0aWNreScpO1xuICAgIH1cbiAgICAkKHdpbmRvdykub2ZmKHRoaXMuc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xuICAgICAgdGhpcy4kZWxlbWVudC51bndyYXAoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblN0aWNreS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEN1c3RvbWl6YWJsZSBjb250YWluZXIgdGVtcGxhdGUuIEFkZCB5b3VyIG93biBjbGFzc2VzIGZvciBzdHlsaW5nIGFuZCBzaXppbmcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJyZsdDtkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyJmd0OyZsdDsvZGl2Jmd0OydcbiAgICovXG4gIGNvbnRhaW5lcjogJzxkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyPjwvZGl2PicsXG4gIC8qKlxuICAgKiBMb2NhdGlvbiBpbiB0aGUgdmlldyB0aGUgZWxlbWVudCBzdGlja3MgdG8uIENhbiBiZSBgJ3RvcCdgIG9yIGAnYm90dG9tJ2AuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ3RvcCdcbiAgICovXG4gIHN0aWNrVG86ICd0b3AnLFxuICAvKipcbiAgICogSWYgYW5jaG9yZWQgdG8gYSBzaW5nbGUgZWxlbWVudCwgdGhlIGlkIG9mIHRoYXQgZWxlbWVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgYW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIElmIHVzaW5nIG1vcmUgdGhhbiBvbmUgZWxlbWVudCBhcyBhbmNob3IgcG9pbnRzLCB0aGUgaWQgb2YgdGhlIHRvcCBhbmNob3IuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJydcbiAgICovXG4gIHRvcEFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSBib3R0b20gYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICBidG1BbmNob3I6ICcnLFxuICAvKipcbiAgICogTWFyZ2luLCBpbiBgZW1gJ3MgdG8gYXBwbHkgdG8gdGhlIHRvcCBvZiB0aGUgZWxlbWVudCB3aGVuIGl0IGJlY29tZXMgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIG1hcmdpblRvcDogMSxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSBib3R0b20gb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICBtYXJnaW5Cb3R0b206IDEsXG4gIC8qKlxuICAgKiBCcmVha3BvaW50IHN0cmluZyB0aGF0IGlzIHRoZSBtaW5pbXVtIHNjcmVlbiBzaXplIGFuIGVsZW1lbnQgc2hvdWxkIGJlY29tZSBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ21lZGl1bSdcbiAgICovXG4gIHN0aWNreU9uOiAnbWVkaXVtJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gc3RpY2t5IGVsZW1lbnQsIGFuZCByZW1vdmVkIG9uIGRlc3RydWN0aW9uLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3lgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdzdGlja3knXG4gICAqL1xuICBzdGlja3lDbGFzczogJ3N0aWNreScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBjb250YWluZXIuIEZvdW5kYXRpb24gZGVmYXVsdHMgdG8gYHN0aWNreS1jb250YWluZXJgLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdzdGlja3ktY29udGFpbmVyJ1xuICAgKi9cbiAgY29udGFpbmVyQ2xhc3M6ICdzdGlja3ktY29udGFpbmVyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBzY3JvbGwgZXZlbnRzIGJldHdlZW4gdGhlIHBsdWdpbidzIHJlY2FsY3VsYXRpbmcgc3RpY2t5IHBvaW50cy4gU2V0dGluZyBpdCB0byBgMGAgd2lsbCBjYXVzZSBpdCB0byByZWNhbGMgZXZlcnkgc2Nyb2xsIGV2ZW50LCBzZXR0aW5nIGl0IHRvIGAtMWAgd2lsbCBwcmV2ZW50IHJlY2FsYyBvbiBzY3JvbGwuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgLTFcbiAgICovXG4gIGNoZWNrRXZlcnk6IC0xXG59O1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjYWxjdWxhdGUgZW0gdmFsdWVzXG4gKiBAcGFyYW0gTnVtYmVyIHtlbX0gLSBudW1iZXIgb2YgZW0ncyB0byBjYWxjdWxhdGUgaW50byBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gZW1DYWxjKGVtKSB7XG4gIHJldHVybiBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBudWxsKS5mb250U2l6ZSwgMTApICogZW07XG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihTdGlja3ksICdTdGlja3knKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRhYnMgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRhYnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlciBpZiB0YWJzIGNvbnRhaW4gaW1hZ2VzXG4gKi9cblxuY2xhc3MgVGFicyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIHRhYnMuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVGFicyNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gdGFicy5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUYWJzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVGFicycpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1RhYnMnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cydcbiAgICAgIC8vICdUQUInOiAnbmV4dCcsXG4gICAgICAvLyAnU0hJRlRfVEFCJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0YWJzIGJ5IHNob3dpbmcgYW5kIGZvY3VzaW5nIChpZiBhdXRvRm9jdXM9dHJ1ZSkgdGhlIHByZXNldCBhY3RpdmUgdGFiLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7J3JvbGUnOiAndGFibGlzdCd9KTtcbiAgICB0aGlzLiR0YWJUaXRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRsaW5rID0gJGVsZW0uZmluZCgnYScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJGVsZW0uaGFzQ2xhc3MoYCR7X3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCksXG4gICAgICAgICAgaGFzaCA9ICRsaW5rWzBdLmhhc2guc2xpY2UoMSksXG4gICAgICAgICAgbGlua0lkID0gJGxpbmtbMF0uaWQgPyAkbGlua1swXS5pZCA6IGAke2hhc2h9LWxhYmVsYCxcbiAgICAgICAgICAkdGFiQ29udGVudCA9ICQoYCMke2hhc2h9YCk7XG5cbiAgICAgICRlbGVtLmF0dHIoeydyb2xlJzogJ3ByZXNlbnRhdGlvbid9KTtcblxuICAgICAgJGxpbmsuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaGFzaCxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBpc0FjdGl2ZSxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgJHRhYkNvbnRlbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ3RhYnBhbmVsJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogIWlzQWN0aXZlLFxuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkXG4gICAgICB9KTtcblxuICAgICAgaWYoaXNBY3RpdmUgJiYgX3RoaXMub3B0aW9ucy5hdXRvRm9jdXMpe1xuICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7IHNjcm9sbFRvcDogJGVsZW0ub2Zmc2V0KCkudG9wIH0sIF90aGlzLm9wdGlvbnMuZGVlcExpbmtTbXVkZ2VEZWxheSwgKCkgPT4ge1xuICAgICAgICAgICAgJGxpbmsuZm9jdXMoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcbiAgICBpZih0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kdGFiQ29udGVudC5maW5kKCdpbWcnKTtcblxuICAgICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XG4gICAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fc2V0SGVpZ2h0LmJpbmQodGhpcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2V0SGVpZ2h0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgIC8vY3VycmVudCBjb250ZXh0LWJvdW5kIGZ1bmN0aW9uIHRvIG9wZW4gdGFicyBvbiBwYWdlIGxvYWQgb3IgaGlzdG9yeSBwb3BzdGF0ZVxuICAgIHRoaXMuX2NoZWNrRGVlcExpbmsgPSAoKSA9PiB7XG4gICAgICB2YXIgYW5jaG9yID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAvL25lZWQgYSBoYXNoIGFuZCBhIHJlbGV2YW50IGFuY2hvciBpbiB0aGlzIHRhYnNldFxuICAgICAgaWYoYW5jaG9yLmxlbmd0aCkge1xuICAgICAgICB2YXIgJGxpbmsgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tocmVmPVwiJythbmNob3IrJ1wiXScpO1xuICAgICAgICBpZiAoJGxpbmsubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5zZWxlY3RUYWIoJChhbmNob3IpLCB0cnVlKTtcblxuICAgICAgICAgIC8vcm9sbCB1cCBhIGxpdHRsZSB0byBzaG93IHRoZSB0aXRsZXNcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rU211ZGdlKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKTtcbiAgICAgICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHsgc2Nyb2xsVG9wOiBvZmZzZXQudG9wIH0sIHRoaXMub3B0aW9ucy5kZWVwTGlua1NtdWRnZURlbGF5KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgenBsdWdpbiBoYXMgZGVlcGxpbmtlZCBhdCBwYWdlbG9hZFxuICAgICAgICAgICAgKiBAZXZlbnQgVGFicyNkZWVwbGlua1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdkZWVwbGluay56Zi50YWJzJywgWyRsaW5rLCAkKGFuY2hvcildKTtcbiAgICAgICAgIH1cbiAgICAgICB9XG4gICAgIH1cblxuICAgIC8vdXNlIGJyb3dzZXIgdG8gb3BlbiBhIHRhYiwgaWYgaXQgZXhpc3RzIGluIHRoaXMgdGFic2V0XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdGhpcy5fY2hlY2tEZWVwTGluaygpO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy5fYWRkS2V5SGFuZGxlcigpO1xuICAgIHRoaXMuX2FkZENsaWNrSGFuZGxlcigpO1xuICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKTtcblxuICAgICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgJCh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIHRoaXMuX2NoZWNrRGVlcExpbmspO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGNsaWNrIGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQ2xpY2tIYW5kbGVyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCdjbGljay56Zi50YWJzJylcbiAgICAgIC5vbignY2xpY2suemYudGFicycsIGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWAsIGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWJvYXJkIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkS2V5SGFuZGxlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kdGFiVGl0bGVzLm9mZigna2V5ZG93bi56Zi50YWJzJykub24oJ2tleWRvd24uemYudGFicycsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYgKGUud2hpY2ggPT09IDkpIHJldHVybjtcblxuXG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJyksXG4gICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLndyYXBPbktleXMpIHtcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9IGkgPT09IDAgPyAkZWxlbWVudHMubGFzdCgpIDogJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSBpID09PSAkZWxlbWVudHMubGVuZ3RoIC0xID8gJGVsZW1lbnRzLmZpcnN0KCkgOiAkZWxlbWVudHMuZXEoaSsxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpO1xuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdUYWJzJywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkZWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHByZXZFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRuZXh0RWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgdGFiIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuIENvbGxhcHNlcyBhY3RpdmUgdGFiLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRhYiB0byBvcGVuLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IGhpc3RvcnlIYW5kbGVkIC0gYnJvd3NlciBoYXMgYWxyZWFkeSBoYW5kbGVkIGEgaGlzdG9yeSB1cGRhdGVcbiAgICogQGZpcmVzIFRhYnMjY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0LCBoaXN0b3J5SGFuZGxlZCkge1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZm9yIGFjdGl2ZSBjbGFzcyBvbiB0YXJnZXQuIENvbGxhcHNlIGlmIGV4aXN0cy5cbiAgICAgKi9cbiAgICBpZiAoJHRhcmdldC5oYXNDbGFzcyhgJHt0aGlzLm9wdGlvbnMubGlua0FjdGl2ZUNsYXNzfWApKSB7XG4gICAgICAgIGlmKHRoaXMub3B0aW9ucy5hY3RpdmVDb2xsYXBzZSkge1xuICAgICAgICAgICAgdGhpcy5fY29sbGFwc2VUYWIoJHRhcmdldCk7XG5cbiAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHpwbHVnaW4gaGFzIHN1Y2Nlc3NmdWxseSBjb2xsYXBzZWQgdGFicy5cbiAgICAgICAgICAgICogQGV2ZW50IFRhYnMjY29sbGFwc2VcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NvbGxhcHNlLnpmLnRhYnMnLCBbJHRhcmdldF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgJG9sZFRhYiA9IHRoaXMuJGVsZW1lbnQuXG4gICAgICAgICAgZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc30uJHt0aGlzLm9wdGlvbnMubGlua0FjdGl2ZUNsYXNzfWApLFxuICAgICAgICAgICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICAgIGhhc2ggPSAkdGFiTGlua1swXS5oYXNoLFxuICAgICAgICAgICR0YXJnZXRDb250ZW50ID0gdGhpcy4kdGFiQ29udGVudC5maW5kKGhhc2gpO1xuXG4gICAgLy9jbG9zZSBvbGQgdGFiXG4gICAgdGhpcy5fY29sbGFwc2VUYWIoJG9sZFRhYik7XG5cbiAgICAvL29wZW4gbmV3IHRhYlxuICAgIHRoaXMuX29wZW5UYWIoJHRhcmdldCk7XG5cbiAgICAvL2VpdGhlciByZXBsYWNlIG9yIHVwZGF0ZSBicm93c2VyIGhpc3RvcnlcbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rICYmICFoaXN0b3J5SGFuZGxlZCkge1xuICAgICAgdmFyIGFuY2hvciA9ICR0YXJnZXQuZmluZCgnYScpLmF0dHIoJ2hyZWYnKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51cGRhdGVIaXN0b3J5KSB7XG4gICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgYW5jaG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgYW5jaG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIHN1Y2Nlc3NmdWxseSBjaGFuZ2VkIHRhYnMuXG4gICAgICogQGV2ZW50IFRhYnMjY2hhbmdlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjaGFuZ2UuemYudGFicycsIFskdGFyZ2V0LCAkdGFyZ2V0Q29udGVudF0pO1xuXG4gICAgLy9maXJlIHRvIGNoaWxkcmVuIGEgbXV0YXRpb24gZXZlbnRcbiAgICAkdGFyZ2V0Q29udGVudC5maW5kKFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VyKFwibXV0YXRlbWUuemYudHJpZ2dlclwiKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgdGFiIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIE9wZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX29wZW5UYWIoJHRhcmdldCkge1xuICAgICAgdmFyICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICAgIGhhc2ggPSAkdGFiTGlua1swXS5oYXNoLFxuICAgICAgICAgICR0YXJnZXRDb250ZW50ID0gdGhpcy4kdGFiQ29udGVudC5maW5kKGhhc2gpO1xuXG4gICAgICAkdGFyZ2V0LmFkZENsYXNzKGAke3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCk7XG5cbiAgICAgICR0YWJMaW5rLmF0dHIoeydhcmlhLXNlbGVjdGVkJzogJ3RydWUnfSk7XG5cbiAgICAgICR0YXJnZXRDb250ZW50XG4gICAgICAgIC5hZGRDbGFzcyhgJHt0aGlzLm9wdGlvbnMucGFuZWxBY3RpdmVDbGFzc31gKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogJ2ZhbHNlJ30pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxhcHNlcyBgJHRhcmdldENvbnRlbnRgIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRhYiB0byBPcGVuLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9jb2xsYXBzZVRhYigkdGFyZ2V0KSB7XG4gICAgdmFyICR0YXJnZXRfYW5jaG9yID0gJHRhcmdldFxuICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YClcbiAgICAgIC5maW5kKCdbcm9sZT1cInRhYlwiXScpXG4gICAgICAuYXR0cih7ICdhcmlhLXNlbGVjdGVkJzogJ2ZhbHNlJyB9KTtcblxuICAgICQoYCMkeyR0YXJnZXRfYW5jaG9yLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKVxuICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApXG4gICAgICAuYXR0cih7ICdhcmlhLWhpZGRlbic6ICd0cnVlJyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciBzZWxlY3RpbmcgYSBjb250ZW50IHBhbmUgdG8gZGlzcGxheS5cbiAgICogQHBhcmFtIHtqUXVlcnkgfCBTdHJpbmd9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IG9yIHN0cmluZyBvZiB0aGUgaWQgb2YgdGhlIHBhbmUgdG8gZGlzcGxheS5cbiAgICogQHBhcmFtIHtib29sZWFufSBoaXN0b3J5SGFuZGxlZCAtIGJyb3dzZXIgaGFzIGFscmVhZHkgaGFuZGxlZCBhIGhpc3RvcnkgdXBkYXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2VsZWN0VGFiKGVsZW0sIGhpc3RvcnlIYW5kbGVkKSB7XG4gICAgdmFyIGlkU3RyO1xuXG4gICAgaWYgKHR5cGVvZiBlbGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgaWRTdHIgPSBlbGVtWzBdLmlkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZFN0ciA9IGVsZW07XG4gICAgfVxuXG4gICAgaWYgKGlkU3RyLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIGlkU3RyID0gYCMke2lkU3RyfWA7XG4gICAgfVxuXG4gICAgdmFyICR0YXJnZXQgPSB0aGlzLiR0YWJUaXRsZXMuZmluZChgW2hyZWY9XCIke2lkU3RyfVwiXWApLnBhcmVudChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKTtcblxuICAgIHRoaXMuX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0LCBoaXN0b3J5SGFuZGxlZCk7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxuICAgKiBJZiBlbmFibGVkIGluIG9wdGlvbnMsIGdldHMgY2FsbGVkIG9uIG1lZGlhIHF1ZXJ5IGNoYW5nZS5cbiAgICogSWYgbG9hZGluZyBjb250ZW50IHZpYSBleHRlcm5hbCBzb3VyY2UsIGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkgb3Igd2l0aCBfcmVmbG93LlxuICAgKiBJZiBlbmFibGVkIHdpdGggYGRhdGEtbWF0Y2gtaGVpZ2h0PVwidHJ1ZVwiYCwgdGFicyBzZXRzIHRvIGVxdWFsIGhlaWdodFxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRIZWlnaHQoKSB7XG4gICAgdmFyIG1heCA9IDAsXG4gICAgICAgIF90aGlzID0gdGhpczsgLy8gTG9jayBkb3duIHRoZSBgdGhpc2AgdmFsdWUgZm9yIHRoZSByb290IHRhYnMgb2JqZWN0XG5cbiAgICB0aGlzLiR0YWJDb250ZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLnBhbmVsQ2xhc3N9YClcbiAgICAgIC5jc3MoJ2hlaWdodCcsICcnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIHBhbmVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGlzQWN0aXZlID0gcGFuZWwuaGFzQ2xhc3MoYCR7X3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApOyAvLyBnZXQgdGhlIG9wdGlvbnMgZnJvbSB0aGUgcGFyZW50IGluc3RlYWQgb2YgdHJ5aW5nIHRvIGdldCB0aGVtIGZyb20gdGhlIGNoaWxkXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJywgJ2Rpc3BsYXknOiAnYmxvY2snfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moe1xuICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgfSlcbiAgICAgIC5jc3MoJ2hlaWdodCcsIGAke21heH1weGApO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIHRhYnMuXG4gICAqIEBmaXJlcyBUYWJzI2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKVxuICAgICAgLm9mZignLnpmLnRhYnMnKS5oaWRlKCkuZW5kKClcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMucGFuZWxDbGFzc31gKVxuICAgICAgLmhpZGUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIGlmICh0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgIT0gbnVsbCkge1xuICAgICAgICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlZXBMaW5rKSB7XG4gICAgICAkKHdpbmRvdykub2ZmKCdwb3BzdGF0ZScsIHRoaXMuX2NoZWNrRGVlcExpbmspO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5UYWJzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3dzIHRoZSB3aW5kb3cgdG8gc2Nyb2xsIHRvIGNvbnRlbnQgb2YgcGFuZSBzcGVjaWZpZWQgYnkgaGFzaCBhbmNob3JcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5rOiBmYWxzZSxcblxuICAvKipcbiAgICogQWRqdXN0IHRoZSBkZWVwIGxpbmsgc2Nyb2xsIHRvIG1ha2Ugc3VyZSB0aGUgdG9wIG9mIHRoZSB0YWIgcGFuZWwgaXMgdmlzaWJsZVxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZGVlcExpbmtTbXVkZ2U6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbmltYXRpb24gdGltZSAobXMpIGZvciB0aGUgZGVlcCBsaW5rIGFkanVzdG1lbnRcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAzMDBcbiAgICovXG4gIGRlZXBMaW5rU211ZGdlRGVsYXk6IDMwMCxcblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBicm93c2VyIGhpc3Rvcnkgd2l0aCB0aGUgb3BlbiB0YWJcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHVwZGF0ZUhpc3Rvcnk6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBhY3RpdmUgcGFuZSBvbiBsb2FkIGlmIHNldCB0byB0cnVlLlxuICAgKiBOb3QgcmVjb21tZW5kZWQgaWYgbW9yZSB0aGFuIG9uZSB0YWIgcGFuZWwgcGVyIHBhZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3Mga2V5Ym9hcmQgaW5wdXQgdG8gJ3dyYXAnIGFyb3VuZCB0aGUgdGFiIGxpbmtzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICB3cmFwT25LZXlzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRhYiBjb250ZW50IHBhbmVzIHRvIG1hdGNoIGhlaWdodHMgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBtYXRjaEhlaWdodDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBhY3RpdmUgdGFicyB0byBjb2xsYXBzZSB3aGVuIGNsaWNrZWQuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBhY3RpdmVDb2xsYXBzZTogZmFsc2UsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gYGxpYCdzIGluIHRhYiBsaW5rIGxpc3QuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ3RhYnMtdGl0bGUnXG4gICAqL1xuICBsaW5rQ2xhc3M6ICd0YWJzLXRpdGxlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGBsaWAgaW4gdGFiIGxpbmsgbGlzdC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnaXMtYWN0aXZlJ1xuICAgKi9cbiAgbGlua0FjdGl2ZUNsYXNzOiAnaXMtYWN0aXZlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGVudCBjb250YWluZXJzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICd0YWJzLXBhbmVsJ1xuICAgKi9cbiAgcGFuZWxDbGFzczogJ3RhYnMtcGFuZWwnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBhY3RpdmUgY29udGVudCBjb250YWluZXIuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJ2lzLWFjdGl2ZSdcbiAgICovXG4gIHBhbmVsQWN0aXZlQ2xhc3M6ICdpcy1hY3RpdmUnXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVGFicywgJ1RhYnMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvZ2dsZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvZ2dsZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9nZ2xlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRvZ2dsZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgVG9nZ2xlciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVG9nZ2xlci5kZWZhdWx0cywgZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuY2xhc3NOYW1lID0gJyc7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb2dnbGVyJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFRvZ2dsZXIgcGx1Z2luIGJ5IHBhcnNpbmcgdGhlIHRvZ2dsZSBjbGFzcyBmcm9tIGRhdGEtdG9nZ2xlciwgb3IgYW5pbWF0aW9uIGNsYXNzZXMgZnJvbSBkYXRhLWFuaW1hdGUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlucHV0O1xuICAgIC8vIFBhcnNlIGFuaW1hdGlvbiBjbGFzc2VzIGlmIHRoZXkgd2VyZSBzZXRcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGUpIHtcbiAgICAgIGlucHV0ID0gdGhpcy5vcHRpb25zLmFuaW1hdGUuc3BsaXQoJyAnKTtcblxuICAgICAgdGhpcy5hbmltYXRpb25JbiA9IGlucHV0WzBdO1xuICAgICAgdGhpcy5hbmltYXRpb25PdXQgPSBpbnB1dFsxXSB8fCBudWxsO1xuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHBhcnNlIHRvZ2dsZSBjbGFzc1xuICAgIGVsc2Uge1xuICAgICAgaW5wdXQgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3RvZ2dsZXInKTtcbiAgICAgIC8vIEFsbG93IGZvciBhIC4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgICB0aGlzLmNsYXNzTmFtZSA9IGlucHV0WzBdID09PSAnLicgPyBpbnB1dC5zbGljZSgxKSA6IGlucHV0O1xuICAgIH1cblxuICAgIC8vIEFkZCBBUklBIGF0dHJpYnV0ZXMgdG8gdHJpZ2dlcnNcbiAgICB2YXIgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkO1xuICAgICQoYFtkYXRhLW9wZW49XCIke2lkfVwiXSwgW2RhdGEtY2xvc2U9XCIke2lkfVwiXSwgW2RhdGEtdG9nZ2xlPVwiJHtpZH1cIl1gKVxuICAgICAgLmF0dHIoJ2FyaWEtY29udHJvbHMnLCBpZCk7XG4gICAgLy8gSWYgdGhlIHRhcmdldCBpcyBoaWRkZW4sIGFkZCBhcmlhLWhpZGRlblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1leHBhbmRlZCcsIHRoaXMuJGVsZW1lbnQuaXMoJzpoaWRkZW4nKSA/IGZhbHNlIDogdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgdG9nZ2xlIHRyaWdnZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZigndG9nZ2xlLnpmLnRyaWdnZXInKS5vbigndG9nZ2xlLnpmLnRyaWdnZXInLCB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSB0YXJnZXQgY2xhc3Mgb24gdGhlIHRhcmdldCBlbGVtZW50LiBBbiBldmVudCBpcyBmaXJlZCBmcm9tIHRoZSBvcmlnaW5hbCB0cmlnZ2VyIGRlcGVuZGluZyBvbiBpZiB0aGUgcmVzdWx0YW50IHN0YXRlIHdhcyBcIm9uXCIgb3IgXCJvZmZcIi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29uXG4gICAqIEBmaXJlcyBUb2dnbGVyI29mZlxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIHRoaXNbIHRoaXMub3B0aW9ucy5hbmltYXRlID8gJ190b2dnbGVBbmltYXRlJyA6ICdfdG9nZ2xlQ2xhc3MnXSgpO1xuICB9XG5cbiAgX3RvZ2dsZUNsYXNzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQudG9nZ2xlQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xuXG4gICAgdmFyIGlzT24gPSB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMuY2xhc3NOYW1lKTtcbiAgICBpZiAoaXNPbikge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaGFzIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29uXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGRvZXMgbm90IGhhdmUgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxuICAgICAgICogQGV2ZW50IFRvZ2dsZXIjb2ZmXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVBUklBKGlzT24pO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgfVxuXG4gIF90b2dnbGVBbmltYXRlKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpKSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25JbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKHRydWUpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICAgICAgdGhpcy5maW5kKCdbZGF0YS1tdXRhdGVdJykudHJpZ2dlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCh0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbk91dCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKGZhbHNlKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xuICAgICAgICB0aGlzLmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBfdXBkYXRlQVJJQShpc09uKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgaXNPbiA/IHRydWUgOiBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIFRvZ2dsZXIgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRvZ2dsZXInKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9nZ2xlci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRlbGxzIHRoZSBwbHVnaW4gaWYgdGhlIGVsZW1lbnQgc2hvdWxkIGFuaW1hdGVkIHdoZW4gdG9nZ2xlZC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGFuaW1hdGU6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9nZ2xlciwgJ1RvZ2dsZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFRvb2x0aXAgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnRvb2x0aXBcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBUb29sdGlwIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBUb29sdGlwLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvb2x0aXAjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIGEgdG9vbHRpcCB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvYmplY3QgdG8gZXh0ZW5kIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvb2x0aXAuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdUb29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRvb2x0aXAgYnkgc2V0dGluZyB0aGUgY3JlYXRpbmcgdGhlIHRpcCBlbGVtZW50LCBhZGRpbmcgaXQncyB0ZXh0LCBzZXR0aW5nIHByaXZhdGUgdmFyaWFibGVzIGFuZCBzZXR0aW5nIGF0dHJpYnV0ZXMgb24gdGhlIGFuY2hvci5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlbGVtSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICd0b29sdGlwJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyA9IHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzIHx8IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zLnRpcFRleHQgPSB0aGlzLm9wdGlvbnMudGlwVGV4dCB8fCB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZSA/ICQodGhpcy5vcHRpb25zLnRlbXBsYXRlKSA6IHRoaXMuX2J1aWxkVGVtcGxhdGUoZWxlbUlkKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWxsb3dIdG1sKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC5odG1sKHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC50ZXh0KHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAndGl0bGUnOiAnJyxcbiAgICAgICdhcmlhLWRlc2NyaWJlZGJ5JzogZWxlbUlkLFxuICAgICAgJ2RhdGEteWV0aS1ib3gnOiBlbGVtSWQsXG4gICAgICAnZGF0YS10b2dnbGUnOiBlbGVtSWQsXG4gICAgICAnZGF0YS1yZXNpemUnOiBlbGVtSWRcbiAgICB9KS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMudHJpZ2dlckNsYXNzKTtcblxuICAgIC8vaGVscGVyIHZhcmlhYmxlcyB0byB0cmFjayBtb3ZlbWVudCBvbiBjb2xsaXNpb25zXG4gICAgdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogR3JhYnMgdGhlIGN1cnJlbnQgcG9zaXRpb25pbmcgY2xhc3MsIGlmIHByZXNlbnQsIGFuZCByZXR1cm5zIHRoZSB2YWx1ZSBvciBhbiBlbXB0eSBzdHJpbmcuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0UG9zaXRpb25DbGFzcyhlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50KSB7IHJldHVybiAnJzsgfVxuICAgIC8vIHZhciBwb3NpdGlvbiA9IGVsZW1lbnQuYXR0cignY2xhc3MnKS5tYXRjaCgvdG9wfGxlZnR8cmlnaHQvZyk7XG4gICAgdmFyIHBvc2l0aW9uID0gZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goL1xcYih0b3B8bGVmdHxyaWdodClcXGIvZyk7XG4gICAgICAgIHBvc2l0aW9uID0gcG9zaXRpb24gPyBwb3NpdGlvblswXSA6ICcnO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfTtcbiAgLyoqXG4gICAqIGJ1aWxkcyB0aGUgdG9vbHRpcCBlbGVtZW50LCBhZGRzIGF0dHJpYnV0ZXMsIGFuZCByZXR1cm5zIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9idWlsZFRlbXBsYXRlKGlkKSB7XG4gICAgdmFyIHRlbXBsYXRlQ2xhc3NlcyA9IChgJHt0aGlzLm9wdGlvbnMudG9vbHRpcENsYXNzfSAke3RoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzfSAke3RoaXMub3B0aW9ucy50ZW1wbGF0ZUNsYXNzZXN9YCkudHJpbSgpO1xuICAgIHZhciAkdGVtcGxhdGUgPSAgJCgnPGRpdj48L2Rpdj4nKS5hZGRDbGFzcyh0ZW1wbGF0ZUNsYXNzZXMpLmF0dHIoe1xuICAgICAgJ3JvbGUnOiAndG9vbHRpcCcsXG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2UsXG4gICAgICAnZGF0YS1pcy1mb2N1cyc6IGZhbHNlLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICByZXR1cm4gJHRlbXBsYXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIHBvc2l0aW9uaW5nIGNsYXNzIHRvIHRyeVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3JlcG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMucHVzaChwb3NpdGlvbiA/IHBvc2l0aW9uIDogJ2JvdHRvbScpO1xuXG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygndG9wJyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdyaWdodCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9XG5cbiAgICAvL2lmIGRlZmF1bHQgY2hhbmdlIGRpZG4ndCB3b3JrLCB0cnkgYm90dG9tIG9yIGxlZnQgZmlyc3RcbiAgICBlbHNlIGlmICghcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIC8vaWYgbm90aGluZyBjbGVhcmVkLCBzZXQgdG8gYm90dG9tXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgIHRoaXMuY291bnRlci0tO1xuICB9XG5cbiAgLyoqXG4gICAqIHNldHMgdGhlIHBvc2l0aW9uIGNsYXNzIG9mIGFuIGVsZW1lbnQgYW5kIHJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB1bnRpbCB0aGVyZSBhcmUgbm8gbW9yZSBwb3NzaWJsZSBwb3NpdGlvbnMgdG8gYXR0ZW1wdCwgb3IgdGhlIHRvb2x0aXAgZWxlbWVudCBpcyBubyBsb25nZXIgY29sbGlkaW5nLlxuICAgKiBpZiB0aGUgdG9vbHRpcCBpcyBsYXJnZXIgdGhhbiB0aGUgc2NyZWVuIHdpZHRoLCBkZWZhdWx0IHRvIGZ1bGwgd2lkdGggLSBhbnkgdXNlciBzZWxlY3RlZCBtYXJnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkdGlwRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy50ZW1wbGF0ZSksXG4gICAgICAgICRhbmNob3JEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQsXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmICgoJHRpcERpbXMud2lkdGggPj0gJHRpcERpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkpKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgIC8vIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6ICRhbmNob3JEaW1zLndpbmRvd0RpbXMud2lkdGggLSAodGhpcy5vcHRpb25zLmhPZmZzZXQgKiAyKSxcbiAgICAgICAgJ2hlaWdodCc6ICdhdXRvJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCdjZW50ZXIgJyArIChwb3NpdGlvbiB8fCAnYm90dG9tJyksIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCkpO1xuXG4gICAgd2hpbGUoIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy50ZW1wbGF0ZSkgJiYgdGhpcy5jb3VudGVyKSB7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHJldmVhbHMgdGhlIHRvb2x0aXAsIGFuZCBmaXJlcyBhbiBldmVudCB0byBjbG9zZSBhbnkgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNjbG9zZW1lXG4gICAqIEBmaXJlcyBUb29sdGlwI3Nob3dcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc2hvd09uICE9PSAnYWxsJyAmJiAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmlzKHRoaXMub3B0aW9ucy5zaG93T24pKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKCdUaGUgc2NyZWVuIGlzIHRvbyBzbWFsbCB0byBkaXNwbGF5IHRoaXMgdG9vbHRpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJykuc2hvdygpO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB0byBjbG9zZSBhbGwgb3RoZXIgb3BlbiB0b29sdGlwcyBvbiB0aGUgcGFnZVxuICAgICAqIEBldmVudCBDbG9zZW1lI3Rvb2x0aXBcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYudG9vbHRpcCcsIHRoaXMudGVtcGxhdGUuYXR0cignaWQnKSk7XG5cblxuICAgIHRoaXMudGVtcGxhdGUuYXR0cih7XG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiB0cnVlLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogZmFsc2VcbiAgICB9KTtcbiAgICBfdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgLy8gY29uc29sZS5sb2codGhpcy50ZW1wbGF0ZSk7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuaGlkZSgpLmNzcygndmlzaWJpbGl0eScsICcnKS5mYWRlSW4odGhpcy5vcHRpb25zLmZhZGVJbkR1cmF0aW9uLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vbWF5YmUgZG8gc3R1ZmY/XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBzaG93blxuICAgICAqIEBldmVudCBUb29sdGlwI3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYudG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIHRoZSBjdXJyZW50IHRvb2x0aXAsIGFuZCByZXNldHMgdGhlIHBvc2l0aW9uaW5nIGNsYXNzIGlmIGl0IHdhcyBjaGFuZ2VkIGR1ZSB0byBjb2xsaXNpb25cbiAgICogQGZpcmVzIFRvb2x0aXAjaGlkZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2hpZGluZycsIHRoaXMuJGVsZW1lbnQuZGF0YSgneWV0aS1ib3gnKSk7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLnRlbXBsYXRlLnN0b3AoKS5hdHRyKHtcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZVxuICAgIH0pLmZhZGVPdXQodGhpcy5vcHRpb25zLmZhZGVPdXREdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgaWYgKF90aGlzLmNsYXNzQ2hhbmdlZCkge1xuICAgICAgICBfdGhpcy50ZW1wbGF0ZVxuICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhfdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyhfdGhpcy50ZW1wbGF0ZSkpXG4gICAgICAgICAgICAgLmFkZENsYXNzKF90aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyk7XG5cbiAgICAgICBfdGhpcy51c2VkUG9zaXRpb25zID0gW107XG4gICAgICAgX3RoaXMuY291bnRlciA9IDQ7XG4gICAgICAgX3RoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogZmlyZXMgd2hlbiB0aGUgdG9vbHRpcCBpcyBoaWRkZW5cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNoaWRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGV2ZW50IGxpc3RlbmVycyBmb3IgdGhlIHRvb2x0aXAgYW5kIGl0cyBhbmNob3JcbiAgICogVE9ETyBjb21iaW5lIHNvbWUgb2YgdGhlIGxpc3RlbmVycyBsaWtlIGZvY3VzIGFuZCBtb3VzZWVudGVyLCBldGMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyICR0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XG4gICAgdmFyIGlzRm9jdXMgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuXG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ21vdXNlZW50ZXIuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKCFfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oJ21vdXNlbGVhdmUuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICBpZiAoIWlzRm9jdXMgfHwgKF90aGlzLmlzQ2xpY2sgJiYgIV90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja09wZW4pIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bi56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vX3RoaXMuaGlkZSgpO1xuICAgICAgICAgIC8vIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfdGhpcy5pc0NsaWNrID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoKF90aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyIHx8ICFfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpKSAmJiAhX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRm9yVG91Y2gpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vbigndGFwLnpmLnRvb2x0aXAgdG91Y2hlbmQuemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgX3RoaXMuaXNBY3RpdmUgPyBfdGhpcy5oaWRlKCkgOiBfdGhpcy5zaG93KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgIC8vICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAvLyAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgICAnY2xvc2UuemYudHJpZ2dlcic6IHRoaXMuaGlkZS5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ2ZvY3VzLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSB0cnVlO1xuICAgICAgICBpZiAoX3RoaXMuaXNDbGljaykge1xuICAgICAgICAgIC8vIElmIHdlJ3JlIG5vdCBzaG93aW5nIG9wZW4gb24gY2xpY2tzLCB3ZSBuZWVkIHRvIHByZXRlbmQgYSBjbGljay1sYXVuY2hlZCBmb2N1cyBpc24ndFxuICAgICAgICAgIC8vIGEgcmVhbCBmb2N1cywgb3RoZXJ3aXNlIG9uIGhvdmVyIGFuZCBjb21lIGJhY2sgd2UgZ2V0IGJhZCBiZWhhdmlvclxuICAgICAgICAgIGlmKCFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyBpc0ZvY3VzID0gZmFsc2U7IH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAub24oJ2ZvY3Vzb3V0LnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlzRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaXNDbGljayA9IGZhbHNlO1xuICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICB9KVxuXG4gICAgICAub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKF90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgX3RoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZHMgYSB0b2dnbGUgbWV0aG9kLCBpbiBhZGRpdGlvbiB0byB0aGUgc3RhdGljIHNob3coKSAmIGhpZGUoKSBmdW5jdGlvbnNcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgdG9vbHRpcCwgcmVtb3ZlcyB0ZW1wbGF0ZSBlbGVtZW50IGZyb20gdGhlIHZpZXcuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3RpdGxlJywgdGhpcy50ZW1wbGF0ZS50ZXh0KCkpXG4gICAgICAgICAgICAgICAgIC5vZmYoJy56Zi50cmlnZ2VyIC56Zi50b29sdGlwJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoYXMtdGlwIHRvcCByaWdodCBsZWZ0JylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtZGVzY3JpYmVkYnkgYXJpYS1oYXNwb3B1cCBkYXRhLWRpc2FibGUtaG92ZXIgZGF0YS1yZXNpemUgZGF0YS10b2dnbGUgZGF0YS10b29sdGlwIGRhdGEteWV0aS1ib3gnKTtcblxuICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlKCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVG9vbHRpcC5kZWZhdWx0cyA9IHtcbiAgZGlzYWJsZUZvclRvdWNoOiBmYWxzZSxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBiZWZvcmUgYSB0b29sdGlwIHNob3VsZCBvcGVuIG9uIGhvdmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDIwMFxuICAgKi9cbiAgaG92ZXJEZWxheTogMjAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIGludG8gdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgKiBAZGVmYXVsdCAxNTBcbiAgICovXG4gIGZhZGVJbkR1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgb3V0IG9mIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMTUwXG4gICAqL1xuICBmYWRlT3V0RHVyYXRpb246IDE1MCxcbiAgLyoqXG4gICAqIERpc2FibGVzIGhvdmVyIGV2ZW50cyBmcm9tIG9wZW5pbmcgdGhlIHRvb2x0aXAgaWYgc2V0IHRvIHRydWVcbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBPcHRpb25hbCBhZGR0aW9uYWwgY2xhc3NlcyB0byBhcHBseSB0byB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBpbml0LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICcnXG4gICAqL1xuICB0ZW1wbGF0ZUNsYXNzZXM6ICcnLFxuICAvKipcbiAgICogTm9uLW9wdGlvbmFsIGNsYXNzIGFkZGVkIHRvIHRvb2x0aXAgdGVtcGxhdGVzLiBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgJ3Rvb2x0aXAnLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICd0b29sdGlwJ1xuICAgKi9cbiAgdG9vbHRpcENsYXNzOiAndG9vbHRpcCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSB0b29sdGlwIGFuY2hvciBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdoYXMtdGlwJ1xuICAgKi9cbiAgdHJpZ2dlckNsYXNzOiAnaGFzLXRpcCcsXG4gIC8qKlxuICAgKiBNaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSBhdCB3aGljaCB0byBvcGVuIHRoZSB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZWZhdWx0ICdzbWFsbCdcbiAgICovXG4gIHNob3dPbjogJ3NtYWxsJyxcbiAgLyoqXG4gICAqIEN1c3RvbSB0ZW1wbGF0ZSB0byBiZSB1c2VkIHRvIGdlbmVyYXRlIG1hcmt1cCBmb3IgdG9vbHRpcC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgdGVtcGxhdGU6ICcnLFxuICAvKipcbiAgICogVGV4dCBkaXNwbGF5ZWQgaW4gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKiBAZGVmYXVsdCAnJ1xuICAgKi9cbiAgdGlwVGV4dDogJycsXG4gIHRvdWNoQ2xvc2VUZXh0OiAnVGFwIHRvIGNsb3NlLicsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRvb2x0aXAgdG8gcmVtYWluIG9wZW4gaWYgdHJpZ2dlcmVkIHdpdGggYSBjbGljayBvciB0b3VjaCBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiB0cnVlLFxuICAvKipcbiAgICogQWRkaXRpb25hbCBwb3NpdGlvbmluZyBjbGFzc2VzLCBzZXQgYnkgdGhlIEpTXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgJydcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBZIGF4aXMuXG4gICAqIEBvcHRpb25cbiAgICogQHR5cGUge251bWJlcn1cbiAgICogQGRlZmF1bHQgMTBcbiAgICovXG4gIHZPZmZzZXQ6IDEwLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBYIGF4aXMsIGlmIGFsaWduZWQgdG8gYSBzaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBkZWZhdWx0IDEyXG4gICAqL1xuICBoT2Zmc2V0OiAxMixcbiAgICAvKipcbiAgICogQWxsb3cgSFRNTCBpbiB0b29sdGlwLiBXYXJuaW5nOiBJZiB5b3UgYXJlIGxvYWRpbmcgdXNlci1nZW5lcmF0ZWQgY29udGVudCBpbnRvIHRvb2x0aXBzLFxuICAgKiBhbGxvd2luZyBIVE1MIG1heSBvcGVuIHlvdXJzZWxmIHVwIHRvIFhTUyBhdHRhY2tzLlxuICAgKiBAb3B0aW9uXG4gICAqIEB0eXBlIHtib29sZWFufVxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgYWxsb3dIdG1sOiBmYWxzZVxufTtcblxuLyoqXG4gKiBUT0RPIHV0aWxpemUgcmVzaXplIGV2ZW50IHRyaWdnZXJcbiAqL1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9vbHRpcCwgJ1Rvb2x0aXAnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVBY2NvcmRpb25UYWJzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlQWNjb3JkaW9uVGFic1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24uYWNjb3JkaW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi50YWJzXG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHJlc3BvbnNpdmUgYWNjb3JkaW9uIHRhYnMuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtYWNjb3JkaW9uLXRhYnMnKTtcbiAgICB0aGlzLmN1cnJlbnRNcSA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbnVsbDtcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuYXR0cignaWQnKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcsRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAncmVzcG9uc2l2ZWFjY29yZGlvbnRhYnMnKSk7XG4gICAgfTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVBY2NvcmRpb25UYWJzJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1lbnUgYnkgcGFyc2luZyB0aGUgY2xhc3NlcyBmcm9tIHRoZSAnZGF0YS1yZXNwb25zaXZlLWFjY29yZGlvbi10YWJzJyBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gVGhlIGZpcnN0IHRpbWUgYW4gSW50ZXJjaGFuZ2UgcGx1Z2luIGlzIGluaXRpYWxpemVkLCB0aGlzLnJ1bGVzIGlzIGNvbnZlcnRlZCBmcm9tIGEgc3RyaW5nIG9mIFwiY2xhc3Nlc1wiIHRvIGFuIG9iamVjdCBvZiBydWxlc1xuICAgIGlmICh0eXBlb2YgdGhpcy5ydWxlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBydWxlc1RyZWUgPSB7fTtcblxuICAgICAgLy8gUGFyc2UgcnVsZXMgZnJvbSBcImNsYXNzZXNcIiBwdWxsZWQgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgbGV0IHJ1bGVzID0gdGhpcy5ydWxlcy5zcGxpdCgnICcpO1xuXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZXZlcnkgcnVsZSBmb3VuZFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcnVsZSA9IHJ1bGVzW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGxldCBydWxlU2l6ZSA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMF0gOiAnc21hbGwnO1xuICAgICAgICBsZXQgcnVsZVBsdWdpbiA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMV0gOiBydWxlWzBdO1xuXG4gICAgICAgIGlmIChNZW51UGx1Z2luc1tydWxlUGx1Z2luXSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJ1bGVzVHJlZVtydWxlU2l6ZV0gPSBNZW51UGx1Z2luc1tydWxlUGx1Z2luXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJ1bGVzID0gcnVsZXNUcmVlO1xuICAgIH1cblxuICAgIHRoaXMuX2dldEFsbE9wdGlvbnMoKTtcblxuICAgIGlmICghJC5pc0VtcHR5T2JqZWN0KHRoaXMucnVsZXMpKSB7XG4gICAgICB0aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRBbGxPcHRpb25zKCkge1xuICAgIC8vZ2V0IGFsbCBkZWZhdWx0cyBhbmQgb3B0aW9uc1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgX3RoaXMuYWxsT3B0aW9ucyA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBNZW51UGx1Z2lucykge1xuICAgICAgaWYgKE1lbnVQbHVnaW5zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFyIG9iaiA9IE1lbnVQbHVnaW5zW2tleV07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFyIGR1bW15UGx1Z2luID0gJCgnPHVsPjwvdWw+Jyk7XG4gICAgICAgICAgdmFyIHRtcFBsdWdpbiA9IG5ldyBvYmoucGx1Z2luKGR1bW15UGx1Z2luLF90aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIGZvciAodmFyIGtleUtleSBpbiB0bXBQbHVnaW4ub3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKHRtcFBsdWdpbi5vcHRpb25zLmhhc093blByb3BlcnR5KGtleUtleSkgJiYga2V5S2V5ICE9PSAnemZQbHVnaW4nKSB7XG4gICAgICAgICAgICAgIHZhciBvYmpPYmogPSB0bXBQbHVnaW4ub3B0aW9uc1trZXlLZXldO1xuICAgICAgICAgICAgICBfdGhpcy5hbGxPcHRpb25zW2tleUtleV0gPSBvYmpPYmo7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRtcFBsdWdpbi5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZSkge1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIE1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBmdW5jdGlvbigpIHtcbiAgICAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBzY3JlZW4gd2lkdGggYWdhaW5zdCBhdmFpbGFibGUgbWVkaWEgcXVlcmllcy4gSWYgdGhlIG1lZGlhIHF1ZXJ5IGhhcyBjaGFuZ2VkLCBhbmQgdGhlIHBsdWdpbiBuZWVkZWQgaGFzIGNoYW5nZWQsIHRoZSBwbHVnaW5zIHdpbGwgc3dhcCBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTWVkaWFRdWVyaWVzKCkge1xuICAgIHZhciBtYXRjaGVkTXEsIF90aGlzID0gdGhpcztcbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlIGFuZCBmaW5kIHRoZSBsYXN0IG1hdGNoaW5nIHJ1bGVcbiAgICAkLmVhY2godGhpcy5ydWxlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3Qoa2V5KSkge1xuICAgICAgICBtYXRjaGVkTXEgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBObyBtYXRjaD8gTm8gZGljZVxuICAgIGlmICghbWF0Y2hlZE1xKSByZXR1cm47XG5cbiAgICAvLyBQbHVnaW4gYWxyZWFkeSBpbml0aWFsaXplZD8gV2UgZ29vZFxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4gaW5zdGFuY2VvZiB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKSByZXR1cm47XG5cbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcGx1Z2luLXNwZWNpZmljIENTUyBjbGFzc2VzXG4gICAgJC5lYWNoKE1lbnVQbHVnaW5zLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyh2YWx1ZS5jc3NDbGFzcyk7XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIENTUyBjbGFzcyBmb3IgdGhlIG5ldyBwbHVnaW5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5jc3NDbGFzcyk7XG5cbiAgICAvLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIG5ldyBwbHVnaW5cbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luKSB7XG4gICAgICAvL2Rvbid0IGtub3cgd2h5IGJ1dCBvbiBuZXN0ZWQgZWxlbWVudHMgZGF0YSB6ZlBsdWdpbiBnZXQncyBsb3N0XG4gICAgICBpZiAoIXRoaXMuY3VycmVudFBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpICYmIHRoaXMuc3RvcmV6ZkRhdGEpIHRoaXMuY3VycmVudFBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicsdGhpcy5zdG9yZXpmRGF0YSk7XG4gICAgICB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgIH1cbiAgICB0aGlzLl9oYW5kbGVNYXJrdXAodGhpcy5ydWxlc1ttYXRjaGVkTXFdLmNzc0NsYXNzKTtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBuZXcgdGhpcy5ydWxlc1ttYXRjaGVkTXFdLnBsdWdpbih0aGlzLiRlbGVtZW50LCB7fSk7XG4gICAgdGhpcy5zdG9yZXpmRGF0YSA9IHRoaXMuY3VycmVudFBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpO1xuXG4gIH1cblxuICBfaGFuZGxlTWFya3VwKHRvU2V0KXtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLCBmcm9tU3RyaW5nID0gJ2FjY29yZGlvbic7XG4gICAgdmFyICRwYW5lbHMgPSAkKCdbZGF0YS10YWJzLWNvbnRlbnQ9Jyt0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykrJ10nKTtcbiAgICBpZiAoJHBhbmVscy5sZW5ndGgpIGZyb21TdHJpbmcgPSAndGFicyc7XG4gICAgaWYgKGZyb21TdHJpbmcgPT09IHRvU2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIHZhciB0YWJzVGl0bGUgPSBfdGhpcy5hbGxPcHRpb25zLmxpbmtDbGFzcz9fdGhpcy5hbGxPcHRpb25zLmxpbmtDbGFzczondGFicy10aXRsZSc7XG4gICAgdmFyIHRhYnNQYW5lbCA9IF90aGlzLmFsbE9wdGlvbnMucGFuZWxDbGFzcz9fdGhpcy5hbGxPcHRpb25zLnBhbmVsQ2xhc3M6J3RhYnMtcGFuZWwnO1xuXG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVBdHRyKCdyb2xlJyk7XG4gICAgdmFyICRsaUhlYWRzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignLicrdGFic1RpdGxlKycsW2RhdGEtYWNjb3JkaW9uLWl0ZW1dJykucmVtb3ZlQ2xhc3ModGFic1RpdGxlKS5yZW1vdmVDbGFzcygnYWNjb3JkaW9uLWl0ZW0nKS5yZW1vdmVBdHRyKCdkYXRhLWFjY29yZGlvbi1pdGVtJyk7XG4gICAgdmFyICRsaUhlYWRzQSA9ICRsaUhlYWRzLmNoaWxkcmVuKCdhJykucmVtb3ZlQ2xhc3MoJ2FjY29yZGlvbi10aXRsZScpO1xuXG4gICAgaWYgKGZyb21TdHJpbmcgPT09ICd0YWJzJykge1xuICAgICAgJHBhbmVscyA9ICRwYW5lbHMuY2hpbGRyZW4oJy4nK3RhYnNQYW5lbCkucmVtb3ZlQ2xhc3ModGFic1BhbmVsKS5yZW1vdmVBdHRyKCdyb2xlJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKS5yZW1vdmVBdHRyKCdhcmlhLWxhYmVsbGVkYnknKTtcbiAgICAgICRwYW5lbHMuY2hpbGRyZW4oJ2EnKS5yZW1vdmVBdHRyKCdyb2xlJykucmVtb3ZlQXR0cignYXJpYS1jb250cm9scycpLnJlbW92ZUF0dHIoJ2FyaWEtc2VsZWN0ZWQnKTtcbiAgICB9ZWxzZXtcbiAgICAgICRwYW5lbHMgPSAkbGlIZWFkcy5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJykucmVtb3ZlQ2xhc3MoJ2FjY29yZGlvbi1jb250ZW50Jyk7XG4gICAgfTtcblxuICAgICRwYW5lbHMuY3NzKHtkaXNwbGF5OicnLHZpc2liaWxpdHk6Jyd9KTtcbiAgICAkbGlIZWFkcy5jc3Moe2Rpc3BsYXk6JycsdmlzaWJpbGl0eTonJ30pO1xuICAgIGlmICh0b1NldCA9PT0gJ2FjY29yZGlvbicpIHtcbiAgICAgICRwYW5lbHMuZWFjaChmdW5jdGlvbihrZXksdmFsdWUpe1xuICAgICAgICAkKHZhbHVlKS5hcHBlbmRUbygkbGlIZWFkcy5nZXQoa2V5KSkuYWRkQ2xhc3MoJ2FjY29yZGlvbi1jb250ZW50JykuYXR0cignZGF0YS10YWItY29udGVudCcsJycpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKS5jc3Moe2hlaWdodDonJ30pO1xuICAgICAgICAkKCdbZGF0YS10YWJzLWNvbnRlbnQ9JytfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKyddJykuYWZ0ZXIoJzxkaXYgaWQ9XCJ0YWJzLXBsYWNlaG9sZGVyLScrX3RoaXMuJGVsZW1lbnQuYXR0cignaWQnKSsnXCI+PC9kaXY+JykucmVtb3ZlKCk7XG4gICAgICAgICRsaUhlYWRzLmFkZENsYXNzKCdhY2NvcmRpb24taXRlbScpLmF0dHIoJ2RhdGEtYWNjb3JkaW9uLWl0ZW0nLCcnKTtcbiAgICAgICAgJGxpSGVhZHNBLmFkZENsYXNzKCdhY2NvcmRpb24tdGl0bGUnKTtcbiAgICAgIH0pO1xuICAgIH1lbHNlIGlmICh0b1NldCA9PT0gJ3RhYnMnKXtcbiAgICAgIHZhciAkdGFic0NvbnRlbnQgPSAkKCdbZGF0YS10YWJzLWNvbnRlbnQ9JytfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKyddJyk7XG4gICAgICB2YXIgJHBsYWNlaG9sZGVyID0gJCgnI3RhYnMtcGxhY2Vob2xkZXItJytfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKTtcbiAgICAgIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoKSB7XG4gICAgICAgICR0YWJzQ29udGVudCA9ICQoJzxkaXYgY2xhc3M9XCJ0YWJzLWNvbnRlbnRcIj48L2Rpdj4nKS5pbnNlcnRBZnRlcigkcGxhY2Vob2xkZXIpLmF0dHIoJ2RhdGEtdGFicy1jb250ZW50JyxfdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpKTtcbiAgICAgICAgJHBsYWNlaG9sZGVyLnJlbW92ZSgpO1xuICAgICAgfWVsc2V7XG4gICAgICAgICR0YWJzQ29udGVudCA9ICQoJzxkaXYgY2xhc3M9XCJ0YWJzLWNvbnRlbnRcIj48L2Rpdj4nKS5pbnNlcnRBZnRlcihfdGhpcy4kZWxlbWVudCkuYXR0cignZGF0YS10YWJzLWNvbnRlbnQnLF90aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgICAgfTtcbiAgICAgICRwYW5lbHMuZWFjaChmdW5jdGlvbihrZXksdmFsdWUpe1xuICAgICAgICB2YXIgdGVtcFZhbHVlID0gJCh2YWx1ZSkuYXBwZW5kVG8oJHRhYnNDb250ZW50KS5hZGRDbGFzcyh0YWJzUGFuZWwpO1xuICAgICAgICB2YXIgaGFzaCA9ICRsaUhlYWRzQS5nZXQoa2V5KS5oYXNoLnNsaWNlKDEpO1xuICAgICAgICB2YXIgaWQgPSAkKHZhbHVlKS5hdHRyKCdpZCcpIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjY29yZGlvbicpO1xuICAgICAgICBpZiAoaGFzaCAhPT0gaWQpIHtcbiAgICAgICAgICBpZiAoaGFzaCAhPT0gJycpIHtcbiAgICAgICAgICAgICQodmFsdWUpLmF0dHIoJ2lkJyxoYXNoKTtcbiAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgIGhhc2ggPSBpZDtcbiAgICAgICAgICAgICQodmFsdWUpLmF0dHIoJ2lkJyxoYXNoKTtcbiAgICAgICAgICAgICQoJGxpSGVhZHNBLmdldChrZXkpKS5hdHRyKCdocmVmJywkKCRsaUhlYWRzQS5nZXQoa2V5KSkuYXR0cignaHJlZicpLnJlcGxhY2UoJyMnLCcnKSsnIycraGFzaCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGlzQWN0aXZlID0gJCgkbGlIZWFkcy5nZXQoa2V5KSkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICBpZiAoaXNBY3RpdmUpIHtcbiAgICAgICAgICB0ZW1wVmFsdWUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICAkbGlIZWFkcy5hZGRDbGFzcyh0YWJzVGl0bGUpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IHBsdWdpbiBvbiB0aGlzIGVsZW1lbnQsIGFzIHdlbGwgYXMgdGhlIHdpbmRvdyByZXNpemUgaGFuZGxlciB0aGF0IHN3aXRjaGVzIHRoZSBwbHVnaW5zIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4pIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgJCh3aW5kb3cpLm9mZignLnpmLlJlc3BvbnNpdmVBY2NvcmRpb25UYWJzJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblJlc3BvbnNpdmVBY2NvcmRpb25UYWJzLmRlZmF1bHRzID0ge307XG5cbi8vIFRoZSBwbHVnaW4gbWF0Y2hlcyB0aGUgcGx1Z2luIGNsYXNzZXMgd2l0aCB0aGVzZSBwbHVnaW4gaW5zdGFuY2VzLlxudmFyIE1lbnVQbHVnaW5zID0ge1xuICB0YWJzOiB7XG4gICAgY3NzQ2xhc3M6ICd0YWJzJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnMudGFicyB8fCBudWxsXG4gIH0sXG4gIGFjY29yZGlvbjoge1xuICAgIGNzc0NsYXNzOiAnYWNjb3JkaW9uJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnMuYWNjb3JkaW9uIHx8IG51bGxcbiAgfVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVBY2NvcmRpb25UYWJzLCAnUmVzcG9uc2l2ZUFjY29yZGlvblRhYnMnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cpXG4gICAgRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG59KSgpO1xuXG52YXIgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xudmFyIGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG4vLyBGaW5kIHRoZSByaWdodCBcInRyYW5zaXRpb25lbmRcIiBldmVudCBmb3IgdGhpcyBicm93c2VyXG52YXIgZW5kRXZlbnQgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gIH1cbiAgdmFyIGVsZW0gPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0cmFuc2l0aW9uc1t0XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn0pKCk7XG5cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgaWYgKGVuZEV2ZW50ID09PSBudWxsKSB7XG4gICAgaXNJbiA/IGVsZW1lbnQuc2hvdygpIDogZWxlbWVudC5oaWRlKCk7XG4gICAgY2IoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuICBlbGVtZW50LmFkZENsYXNzKGFuaW1hdGlvbik7XG4gIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudC5jc3MoJ3RyYW5zaXRpb24nLCAnJyk7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZSgndHJhbnNpdGlvbmVuZCcsIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoaW5pdENsYXNzICsgJyAnICsgYWN0aXZlQ2xhc3MgKyAnICcgKyBhbmltYXRpb24pO1xuICB9XG59XG5cbnZhciBNb3Rpb25VSSA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn07XG4iLCIiLCJqUXVlcnkoZG9jdW1lbnQpLmZvdW5kYXRpb24oKTtcbiIsIi8qIFN0aWNreSBGb290ZXIgKi9cblxuKGZ1bmN0aW9uKCQpIHtcblxuICB2YXIgJGZvb3RlciA9ICQoJ1tkYXRhLXN0aWNreS1mb290ZXJdJyk7IC8vIG9ubHkgc2VhcmNoIG9uY2VcblxuICAkKHdpbmRvdykuYmluZCgnbG9hZCByZXNpemUgb3JpZW50YXRpb25DaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgcG9zID0gJGZvb3Rlci5wb3NpdGlvbigpLFxuICAgICAgICBoZWlnaHQgPSAoJCh3aW5kb3cpLmhlaWdodCgpIC0gcG9zLnRvcCkgLSAoJGZvb3Rlci5oZWlnaHQoKSAtMSk7XG5cbiAgICBpZiAoaGVpZ2h0ID4gMCkge1xuICAgICAgICRmb290ZXIuY3NzKCdtYXJnaW4tdG9wJywgaGVpZ2h0KTtcbiAgICB9XG5cbiAgfSk7XG5cbn0pKGpRdWVyeSk7XG4iLCIiXX0=
