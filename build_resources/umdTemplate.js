/** @module @NAMESPACE@/@PACKAGE@/@MODULENAME@.js */
/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 

/** Module UMD Pattern */

(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([@DEPS@], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        /* global module: false */
        module.exports = factory(require(@DEPS@));
    } else {
        // Browser globals (root is window)
        root.@NAMESPACE@ = root.@NAMESPACE@ || {};
        root.@NAMESPACE@.@PACKAGE@ = root.@NAMESPACE@.@PACKAGE@ || {};
        root.@NAMESPACE@.@PACKAGE@.@MODULENAME@= factory(@GLOBALDEPS@);
  }

}(this, function (@DEPALIAS@) {
"use strict";
var VERSION = '@VERSION@';

@CONTENTS@

return { @RETURNS@ };


}));


