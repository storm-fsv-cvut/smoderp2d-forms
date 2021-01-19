(function () {
  var sF = {
    debbuging: true,
    places: 2, // počet desetinných míst používaných čísel ve formuláři
    placesInXml: 12, // počet desetinných míst používaných čísel při výpočtech
    dictionaryUrl: null,
    dictionaryJSON: null,
    endpointUrl: 'https://rain1.fsv.cvut.cz:4444/services/wps/',//'http://rain1.fsv.cvut.cz:8080/services/wps/', //'http://geo102.fsv.cvut.cz:80/services/yfsgwps', //'http://geo102.fsv.cvut.cz/services/yfsgwps', //'response.xml', //'https://rain1.fsv.cvut.cz/services/wps',
    defaultRes: 1,
    defaultEndtime: 60,
    defaultMaxdt: 1,
    defaultslopeWidth: 1,
    defaultResMin: 0.3,
    defaultResMax: 5,
    defaultEndtimeMin: 15,
    defaultEndtimeMax: 1000,
    defaultMaxdtMin: 1,
    defaultMaxdtMax: 30,
    defaultSlopeWidthMin: 1,
    defaultSlopeWidthMax: 300,
    defaultProjectionMax: 100,
    userRainFalls: [],
    fifteenRainFallValue: null,
    lastUsedSelect: null,
    globalColumnTexts: {
      'measures': ['ms_name','ms_code','ms_roughness','ms_captured','ms_ratio','ms_retention','ms_tangential', 'ms_maxspeed'],
      'surfaces': ['srf_name','srf_code','k','s','b','x','y']
    },
    globalColumnNames: {
      'measures': ['name','code','n','pi','ppl','ret','tau','v'],
      'surfaces': ['name','code','k','s','b','x','y']
    },
    nDecPlc: {
      'k': 12,
      's': 12,
      'b': 4,
      'x': 4,
      'y': 4,
      'n': 4,
      'pi': 2,
      'ppl': 2,
      'ret': 2,
      'tau': 2,
      'v': 2
    },
    surfaces: [],
    measures: [],

    hasClass: function (el, className) {
      return el.classList ? el.classList.contains(className) : new RegExp('\\b'+ className+'\\b').test(el.className);
    },

    addClass: function (el, className) {
      if (el.classList) el.classList.add(className);
      else if (!mmk.hasClass(el, className)) el.className += ' ' + className;
    },

    removeClass: function (el, className) {
      if (el.classList) el.classList.remove(className);
      else el.className = el.className.replace(new RegExp('\\b'+ className+'\\b', 'g'), '');
    },

    round: function (number, places) {
      places = Math.pow(10, places);
      number = number * places;
      number = Math.round(number);
      number = number / places;
      return number;
    },

    markRow: function(table,order,state) {
      var rows = table.getElementsByTagName('TR');
      switch (state) {
        case 'invalid':
          sF.removeClass(rows[order],'jsf-valid');
          sF.addClass(rows[order],'jsf-invalid');
          break;
        case 'valid':
          sF.removeClass(rows[order],'jsf-invalid');
          sF.addClass(rows[order],'jsf-valid');
          break;
      }
    },

    mode: {
      formBox: null,
      resultBox: null,

      showEl: function(el) {
        sF.removeClass(el, 'is--hidden');
        sF.addClass(el, 'is--shown');
      },

      hideEl: function(el) {
        sF.removeClass(el, 'is--shown');
        sF.addClass(el, 'is--hidden');
      },

      showForm: function() {
        sF.mode.hideEl(sF.mode.resultBox);
        sF.mode.showEl(sF.mode.formBox);

        if (sF.outputs.accepted) {
          var toResultHandlers = document.getElementsByClassName('jsf-to-result-handler');
          for (var i = 0; i < toResultHandlers.length; i++) {sF.mode.showEl(toResultHandlers[i]);}
          var toFormHandlers = document.getElementsByClassName('jsf-to-form-handler');
          for (var i = 0; i < toFormHandlers.length; i++) {sF.mode.hideEl(toFormHandlers[i]);}
        }

        sF.mode.bindHandlers(sF.mode.formBox);
      },

      showResults: function() {
        sF.mode.hideEl(sF.mode.formBox);
        sF.mode.showEl(sF.mode.resultBox);

        var toFormHandlers = document.getElementsByClassName('jsf-to-form-handler');
        for (var i = 0; i < toFormHandlers.length; i++) {sF.mode.showEl(toFormHandlers[i]);}
        var toResultHandlers = document.getElementsByClassName('jsf-to-result-handler');
        for (var i = 0; i < toResultHandlers.length; i++) {sF.mode.hideEl(toResultHandlers[i]);}

        sF.mode.bindHandlers(sF.mode.resultBox);
      },

      bindHandlers: function(target) {
        ((sF.debbuging) ? console.log('Info: Binding handlers on element: ' + target.tagName + ', with class: ' + target.className) : null);
        var toFormHandlers = target.getElementsByClassName('jsf-to-form-handler');
        for (var i = 0; i < toFormHandlers.length; i++) {
          if (!toFormHandlers[i].hasAttribute('data-mode-handler')) {
            toFormHandlers[i].addEventListener('click', function() {
              sF.mode.showForm();
            });
            toFormHandlers[i].setAttribute('data-mode-handler','true');
          }
        }
        var toResultHandlers = target.getElementsByClassName('jsf-to-result-handler');
        for (var i = 0; i < toResultHandlers.length; i++) {
          if (!toResultHandlers[i].hasAttribute('data-mode-handler')) {
            toResultHandlers[i].addEventListener('click', function() {
              sF.mode.showResults();
            });
            toResultHandlers[i].setAttribute('data-mode-handler','true');
          }
        }
      },

      init: function() {
        var formBox = document.getElementById('jsf-mainbox'),
            resultBox = document.getElementById('jsf-resultbox');

        if ((formBox) && (resultBox)) {
          sF.mode.formBox = formBox;
          sF.mode.resultBox = resultBox;
          return true;
        }
        return false;
      }
    },

    modal: {
      initialized: false,
      opened: null,
      mainEl: null,

      bindClosers: function() {
        if (sF.modal.initialized) {
          var closers = sF.modal.mainEl.getElementsByClassName('jsf-modal-closer');
          for (var i=0; i<closers.length; i++) {
            if ((closers[i].getAttribute('data-jsf-closer-init') != true) || (closers[i].getAttribute('data-jsf-closer-init') != 'true') || (closers[i].getAttribute('data-jsf-closer-init') != 'TRUE')) {
              closers[i].addEventListener('click', function(){
                sF.modal.close(true);
              });
              closers[i].setAttribute('data-jsf-closer-init',true);
            }
          }
        }
      },

      open: function(boxName) {
        if (sF.modal.initialized) {
          var boxes = sF.modal.mainEl.getElementsByClassName('jsf-box'),
              correctId = 'jsf-' + boxName,
              body = document.getElementsByTagName('BODY')[0];

          for (var i=0; i<boxes.length; i++) {
            if (boxes[i].id === correctId) {
              sF.removeClass(boxes[i], 'jsf-closed');
              sF.addClass(boxes[i], 'jsf-open');
            } else {
              sF.removeClass(boxes[i], 'jsf-open');
              sF.addClass(boxes[i], 'jsf-closed');
            }
          }

          body.style.overflow = 'hidden';
          sF.removeClass(sF.modal.mainEl, 'jsf-closed');
          sF.addClass(sF.modal.mainEl, 'jsf-open');
          sF.modal.bindClosers();
          sF.modal.opened = true;
        }
      },

      close: function(mode) {
        if (sF.modal.initialized) {
          var body = document.getElementsByTagName('BODY')[0];
          sF.removeClass(sF.modal.mainEl, 'jsf-open');
          sF.addClass(sF.modal.mainEl, 'jsf-closed');
          body.style.overflow = 'auto';
        }
        if (mode) {
          sF.lastSelectToFirstOption();
        }
        sF.modal.opened = false;
      },

      init: function() {
        sF.modal.mainEl = document.getElementById('jsf-modal');
        if (sF.modal.mainEl) {
          sF.modal.initialized = true;
        }
      }
    },

    meSu: {
      inits: [],
      globalTables: {},
      globalAddingButtons: {},
      counters: {},

      validate: function(code) {
        var error = false,
            input = null,
            name = null,
            inputName = null,
            value = null,
            itemCode = '';

        for (var i = 0; i < sF.globalColumnNames[code].length; i++) {
          name = sF.globalColumnNames[code][i];
          inputName = code + '-' + name;
          input = document.getElementsByName(inputName)[0],
          value = input.value;

          if (name == 'code') {
            itemCode = value.toUpperCase();

            if (code == 'measures') {
              for (var j = 0; j < sF.measures.length; j++) {
                if (itemCode == sF.measures[j]['code'].toUpperCase()) {
                  error = true;
                }
              }
            } else if (code == 'surfaces') {
              for (var j = 0; j < sF.surfaces.length; j++) {
                if (itemCode == sF.surfaces[j]['code'].toUpperCase()) {
                  error = true;
                }
              }
            }
          }

          ((!value) ? error = true : null);

          if (input.type == 'number') {
            ((isNaN(value)) ? error = true : null);
            value = parseFloat(value);
            (((input.min) && (value < input.min)) ? error = true : null);
            (((input.max) && (value > input.max)) ? error = true : null);
          }
        }

        if (error === false) {
          return true;
        }
        return false
      },

      validating: function(code) {
        var order = sF.meSu.counters[code] + 1;
        if (sF.meSu.validate(code)) {
          sF.markRow(sF.meSu.globalTables[code],order,'valid');
        } else {
          sF.markRow(sF.meSu.globalTables[code],order,'invalid');
        }
      },

      add: function(code) {
        if (sF.meSu.validate(code)) {
          var array = [],
              input = null,
              name = null,
              inputName = null,
              inputValue = null,
              newObject = new Object();

          for (var i = 0; i < sF.globalColumnNames[code].length; i++) {
            name = sF.globalColumnNames[code][i];
            inputName = code + '-' + name;
            input = document.getElementsByName(inputName)[0];
            inputValue = input.value;
            if (!isNaN(inputValue)) {
              inputValue = parseFloat(inputValue);
            } else if (name == 'code') {
              inputValue = inputValue.toUpperCase();
            }
            newObject[sF.globalColumnNames[code][i]] = inputValue;
          }

          if (code == 'measures') {
            sF.measures[sF.meSu.counters[code]] = newObject;
          } else if (code == 'surfaces') {
            sF.surfaces[sF.meSu.counters[code]] = newObject;
          }

          sF.meSu.refill(code);
          sF.modal.close(false);

          sF.section.addNewSelectOption(code,newObject['code'],newObject['name']);
        } else {
          console.log('Error: ' + code + ' can\'t be added.');
        }
      },

      addInput: function(code,cell,name) {
        var input = document.createElement('INPUT'),
        inputName = code + '-' + name;

        input.setAttribute('name', inputName);
        //input.setAttribute('class', 'sf-main-box is--table-input is--name'); // TODO is on modal

        switch (name) {
          case 'name':
            input.setAttribute('type', 'text');
            input.setAttribute('size', '16');
            break;
          case 'code':
            input.setAttribute('type', 'text');
            input.setAttribute('size', '4');
            input.setAttribute('maxlength', '4');
            break;
          case 'k':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.000000000001');
            input.setAttribute('max', '1');
            input.setAttribute('step', '0.000000000001');
            input.setAttribute('size', '14');
            break;
          case 's':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.000000000001');
            input.setAttribute('max', '1');
            input.setAttribute('step', '0.000000000001');
            input.setAttribute('size', '14');
            break;
          case 'b':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '1');
            input.setAttribute('max', '2');
            input.setAttribute('step', '0.0001');
            input.setAttribute('value', '1.5');
            input.setAttribute('size', '6');
            break;
          case 'x':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '6');
            input.setAttribute('max', '15');
            input.setAttribute('step', '0.0001');
            input.setAttribute('value', '10');
            input.setAttribute('size', '6');
            break;
          case 'y':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.35');
            input.setAttribute('max', '0.7');
            input.setAttribute('step', '0.0001');
            input.setAttribute('value', '0.5');
            input.setAttribute('size', '6');
            break;
          case 'n':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.0001');
            input.setAttribute('max', '1');
            input.setAttribute('step', '0.0001');
            input.setAttribute('value', '0.035');
            input.setAttribute('size', '6');
            break;
          case 'pi':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0');
            input.setAttribute('max', '100');
            input.setAttribute('step', '0.05');
            input.setAttribute('value', '0.2');
            input.setAttribute('size', '6');
            break;
          case 'ppl':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.05');
            input.setAttribute('max', '1');
            input.setAttribute('step', '0.05');
            input.setAttribute('value', '0.5');
            input.setAttribute('size', '6');
            break;
          case 'ret':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0');
            input.setAttribute('max', '100');
            input.setAttribute('step', '0.05');
            input.setAttribute('value', '2');
            input.setAttribute('size', '7');
            break;
          case 'tau':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.01');
            input.setAttribute('max', '10000');
            input.setAttribute('step', '0.01');
            input.setAttribute('size', '8');
            break;
          case 'v':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.01');
            input.setAttribute('max', '10');
            input.setAttribute('step', '0.01');
            input.setAttribute('size', '6');
            break;
        }

        input.setAttribute('data-type', inputName);
        input.setAttribute('data-order', sF.meSu.counters[code]);

        input.addEventListener('input', function(e) {
          sF.meSu.validating(code);
        });

        cell.appendChild(input);
      },

      refill: function(code) {
        var tableRows = sF.meSu.globalTables[code].getElementsByTagName('TR'),
            rowsParentNode = tableRows[0].parentNode,
            rowsNumber = tableRows.length;

        for (var i=0; i<rowsNumber; i++) {
          rowsParentNode.removeChild(rowsParentNode.lastChild);
        }

        sF.meSu.fill(code);
      },

      fill: function(code) {
        if (sF.meSu.inits[code] === true) {
          var row = null,
              counter = 0,
              array = [],
              cell = null,
              data = null;

          // table header
          row = sF.meSu.globalTables[code].insertRow();
          for (var l = 0; l < sF.globalColumnTexts[code].length; l++) {
            cell = row.insertCell(l);
            cell.innerHTML = sF.globalColumnTexts[code][l];
          }

          // table data - rows
          if (code == 'measures') {
            data = sF.measures;
          } else if (code == 'surfaces') {
            data = sF.surfaces;
          }

          while (data[counter]) {
            row = sF.meSu.globalTables[code].insertRow();
            array = [];

            for (var j=0; j<sF.globalColumnNames[code].length; j++) {
              array.push(data[counter][sF.globalColumnNames[code][j]]);
            }

            // table data - cells
            for (var k=0; k<array.length; k++) {
              cell = row.insertCell(k);
              cell.innerHTML = array[k];
            }
            counter++;
          }

          // important
          sF.meSu.counters[code] = counter;

          // table inputs
          row = sF.meSu.globalTables[code].insertRow();
          for (var i=0; i<sF.globalColumnNames[code].length; i++) {
            cell = row.insertCell(i);
            sF.meSu.addInput(code,cell,sF.globalColumnNames[code][i]);
          }

        }
      },

      init: function(code) {
        if (sF.meSu.inits[code] !== true) {
          sF.meSu.globalTables[code] = document.getElementById('jsf-' + code + '-table');
          if ((sF.meSu.globalTables[code]) && ((sF.meSu.globalTables[code].tagName === 'table') || (sF.meSu.globalTables[code].tagName === 'TABLE'))) {
            sF.meSu.globalAddingButtons[code] = document.getElementById('jsf-' + code + '-add');
            if (sF.meSu.globalAddingButtons[code]) {

              sF.meSu.globalAddingButtons[code].addEventListener('click', function(e) {
                sF.meSu.validating(code);
                sF.meSu.add(code);
              });

              sF.meSu.inits[code] = true;

              sF.meSu.fill(code);
            } else {
              console.log('Error: ' + code + ' button missing.');
            }
          } else {
            console.log('Error: ' + code + ' table missing.');
          }
        }
      }
    },

    iniData: {
      init: function() {
        var resolutionInput = document.getElementById('resolution'),
            simulationLengthInput = document.getElementById('simulation-length'),
            maxdtInput = document.getElementById('maxdt'),
            slopeWidthInput = document.getElementById('slope-width');

        if (resolutionInput) {
          resolutionInput.min = sF.defaultResMin;
          resolutionInput.max = sF.defaultResMax;
          resolutionInput.value = sF.defaultRes;

          resolutionInput.addEventListener('change', function(e) {
            var input = e.target,
                value = parseFloat(input.value);

            ((value < parseFloat(input.min)) ? input.value = input.min : null);
            ((value > parseFloat(input.max)) ? input.value = input.max : null);

            sF.section.validateAllRows();
            sF.section.setAllMinValues();
          });
        } else {
          console.log('Warning: resolution input missing.');
        }

        if (simulationLengthInput) {
          simulationLengthInput.min = sF.defaultEndtimeMin;
          simulationLengthInput.max = sF.defaultEndtimeMax;
          simulationLengthInput.value = sF.defaultEndtime;
        } else {
          console.log('Warning: simulation length input missing.');
        }

        if (maxdtInput) {
          maxdtInput.min = sF.defaultMaxdtMin;
          maxdtInput.max = sF.defaultMaxdtMax;
          maxdtInput.value = sF.defaultMaxdt;
        } else {
          console.log('Warning: max dt input missing.');
        }

        if (slopeWidthInput) {
          slopeWidthInput.min = sF.defaultSlopeWidthMin;
          slopeWidthInput.max = sF.defaultSlopeWidthMax;
          slopeWidthInput.value = sF.defaultslopeWidth;
        } else {
          console.log('Warning: slope width input missing.');
        }
      }
    },

    lastSelectToFirstOption: function() {
      if (sF.lastUsedSelect) {
        if ((sF.lastUsedSelect.nodeName === 'select') || (sF.lastUsedSelect.nodeName === 'SELECT')) {
          if (sF.lastUsedSelect.name == 'rainfall-type') {
            sF.lastUsedSelect.value = sF.lastUsedSelect.getElementsByTagName('OPTION')[0].value;
            sF.rainfall.setSetupButton(false);
          } else {
            var options = sF.lastUsedSelect.getElementsByTagName('OPTION'),
                order = null;

            ((sF.lastUsedSelect.hasAttribute('data-order')) ? order = sF.lastUsedSelect.getAttribute('data-order') : order = 0);
            sF.lastUsedSelect.value = options[0].value;
            sF.section.isValid(order);
          }
        }
      }
    },

    section: {
      initialized: false,
      mainTable: null,
      addButton: null,
      counter: 1,
      lastSelect: null,

      isRatioValueCorrect: function(str) {
        if (str.indexOf('1:') === 0) {
          var array = str.split(':');
          if (isNaN(array[1])) {
            return false;
          } else {
            return true;
          }
        }
        return false;
      },

      getRatioValue: function(str) {
        if (sF.section.isRatioValueCorrect(str)) {
          var array = str.split(':');
          return array[1];
        }
        return null;
      },

      isValid: function(order) {
        var table = sF.section.mainTable,
            rows = table.getElementsByTagName('TR'),
            examinedRow = rows[order],
            dataType = null,
            discrepancyFound = false;

        if (examinedRow) {
          var inputs = examinedRow.getElementsByTagName('input'),
              selects = examinedRow.getElementsByTagName('select'),
              resolutionInput = document.getElementById('resolution'),
              actualRes = null,
              projectionValue = null,
              heightValue = null;

          ((resolutionInput) ? actualRes = parseFloat(resolutionInput.value) : actualRes = sF.defaultRes);
          ((!actualRes) ? actualRes = sF.defaultRes : null);

          for (var i = 0; i < inputs.length; i++) {
            ((inputs[i].hasAttribute('data-type')) ? dataType = inputs[i].getAttribute('data-type') : dataType = null);

            switch (dataType) {
              case 'projection':
                 if (isNaN(inputs[i].value)) {
                   discrepancyFound = true;
                 } else {
                    projectionValue = inputs[i].value;
                    ((inputs[i].value < actualRes) ? discrepancyFound = true : null);
                    ((inputs[i].value > 100) ? discrepancyFound = true : null);
                  }
                break;
              case 'height':
                if (isNaN(inputs[i].value)) {
                  discrepancyFound = true;
                } else {
                  heightValue = inputs[i].value;
                  ((inputs[i].value <= 0) ? discrepancyFound = true : null);
                  ((inputs[i].value > 100) ? discrepancyFound = true : null);
                }
                break;
              case 'ratio':
                ((inputs[i].value == 0) ? discrepancyFound = true : null);
                ((inputs[i].value == '') ? discrepancyFound = true : null);
                break;
            }
          }

          for (var i = 0; i < selects.length; i++) {
            ((selects[i].hasAttribute('data-type')) ? dataType = selects[i].getAttribute('data-type') : dataType = null);
            if ((dataType == 'measures') || (dataType == 'surfaces')) {
              (((selects[i].value == 'needSelect') || (selects[i].value == 'addNew')) ? discrepancyFound = true : null);
            }
          }

          if (!discrepancyFound) {
            (((projectionValue / heightValue) < 1) ? discrepancyFound = true : null);
          }
        }

        if (discrepancyFound) {
          sF.markRow(table,order,'invalid');
        } else {
          sF.markRow(table,order,'valid');
        }
      },

      validateAllRows: function() {
        var table = sF.section.mainTable,
            rows = table.getElementsByTagName('TR');

        for (var i = 1; i < rows.length; i++) { // ignore header row!
          sF.section.isValid(i);
        }
      },

      setAllMinValues: function() {
        var newMinValues = document.getElementById('resolution').value,
            allProjectionInputs = document.getElementsByClassName('is--projection');
        if (newMinValues) {
          for (var i = 0; i < allProjectionInputs.length; i++) {
            if ((allProjectionInputs[i].tagName == 'INPUT') || (allProjectionInputs[i].tagName == 'input')) {
              allProjectionInputs[i].min = newMinValues;
              if ((allProjectionInputs[i].value) && (!isNaN(allProjectionInputs[i].value)) && (allProjectionInputs[i].value < newMinValues)) {
                allProjectionInputs[i].value = newMinValues;
                sF.section.calculate(allProjectionInputs[i]);
              }
            }
          }
        }
      },

      calculate: function(input) {
        var type = input.getAttribute('data-type'),
            order = input.getAttribute('data-order'),
            projectionInput = document.getElementsByName('projection-' + order)[0],
            heightInput = document.getElementsByName('height-' + order)[0],
            ratioInput = document.getElementsByName('ratio-' + order)[0],
            projectionValue = parseFloat(projectionInput.value),
            heightValue = parseFloat(heightInput.value);
            ratioValue = ratioInput.value;

        if ((!isNaN(projectionValue)) && (projectionValue >= 0) && (!isNaN(heightValue)) && (heightValue >= 0)) {
          switch (type) {
            case 'projection':
              if (heightValue > 0) {
                var newValue = projectionValue / heightValue;
                ratioInput.value = '1:' + sF.round(newValue,sF.places);
                sF.section.isValid(order);
              } else if (sF.section.isRatioValueCorrect(ratioValue)) {
                var newValue = projectionValue / sF.section.getRatioValue(ratioValue);
                heightInput.value = sF.round(newValue,sF.places);
                sF.section.isValid(order);
              }
              break;
            case 'height':
              if (projectionValue > 0) {
                var newValue = projectionValue / heightValue;
                ratioInput.value = '1:' + sF.round(newValue,sF.places);
                sF.section.isValid(order);
              } else if (sF.section.isRatioValueCorrect(ratioValue)) {
                var newValue = heightValue * sF.section.getRatioValue(ratioValue);
                projectionInput.value = sF.round(newValue,sF.places);
                sF.section.isValid(order);
              }
              break;
            case 'ratio':
              if (sF.section.isRatioValueCorrect(ratioValue)) {
                if (projectionValue > 0) {
                  var newValue = projectionValue / sF.section.getRatioValue(ratioValue);
                  heightInput.value = newValue;
                  sF.section.isValid(order);
                } else if (heightValue > 0) {
                  var newValue = heightValue * sF.section.getRatioValue(ratioValue);
                  projectionInput.value = newValue;
                  sF.section.isValid(order);
                }
              } else {
                sF.section.isValid(order);
              }
              break;
          }
        } else {
          sF.section.isValid(order);
        }
      },

      addInput: function(cell,name) {
        var input = document.createElement('INPUT'),
            inputName = name + '-' + sF.section.counter,
            eventName = 'input';

        input.setAttribute('class', 'sf-main-box is--table-input is--' + name);

        switch (name) {
          case 'projection':
            input.setAttribute('type', 'number');
            input.setAttribute('min', sF.defaultRes);
            input.setAttribute('max', sF.defaultProjectionMax);
            input.setAttribute('step', '0.1');
            input.setAttribute('size', '4');
            input.setAttribute('maxlength', '4');
            eventName = 'input';
            break;
          case 'height':
            input.setAttribute('type', 'number');
            input.setAttribute('min', '0.1');
            input.setAttribute('max', sF.defaultProjectionMax);
            input.setAttribute('step', '0.1');
            input.setAttribute('size', '4');
            input.setAttribute('maxlength', '4');
            eventName = 'input';
            break;
          case 'ratio':
            input.setAttribute('type', 'text');
            input.setAttribute('value', '');
            input.setAttribute('size', '6');
            eventName = 'change';
            break;
        }

        input.setAttribute('name', inputName);
        input.setAttribute('data-type', name);
        input.setAttribute('data-order', sF.section.counter);

        input.addEventListener(eventName, function(e) {
          var input = e.target;
          sF.section.calculate(input);
        });

        if ((name === 'height') || (name === 'projection')) {
          input.addEventListener('change', function(e) {
            var input = e.target;
            ((parseFloat(input.value) < parseFloat(input.min)) ? input.value = input.min : null);
            ((parseFloat(input.value) > parseFloat(input.max)) ? input.value = input.max : null);
            sF.section.calculate(input);
          });
        }

        cell.appendChild(input);
      },

      addNewSelectOption: function(type,code,text) {
        var order = null,
            select = null,
            selectName = null,
            option = null;

        for (var i=0; i<sF.section.counter; i++) {
          order = i + 1;
          selectName = type + '-' + order;
          select = document.getElementsByName(selectName)[0],
          lastChild = null;

          if (select) {
            option = document.createElement('OPTION');
            option.setAttribute('value', code);
            option.text = text;

            lastChild = select.lastChild;
            select.insertBefore(option,lastChild);
          }
        }

        sF.lastUsedSelect.value = code;
      },

      addSelect: function(cell, code) {
        var select = document.createElement('SELECT'),
            selectName = code + '-' + sF.section.counter,
            i = 0,
            option = null,
            data = null;

        select.setAttribute('name', selectName);
        select.setAttribute('class', 'sf-main-box is--table-select');
        select.setAttribute('data-type', code);
        select.setAttribute('data-order', sF.section.counter);

        option = document.createElement('OPTION');
        option.setAttribute('value', 'needSelect');
        option.text = sF.dictionary.getValue('choose');
        select.appendChild(option);

        if (code == 'measures') {
          data = sF.measures;
        } else if (code == 'surfaces') {
          data = sF.surfaces;
        }

        while (data[i]) {
          option = document.createElement('OPTION');
          option.setAttribute('value', data[i]['code']);
          option.text = data[i]['name'];
          select.appendChild(option);
          i++;
        }

        option = document.createElement('OPTION');
        option.setAttribute('value', 'addNew');
        option.text = sF.dictionary.getValue('add_another');
        select.appendChild(option);

        select.addEventListener('change', function(e) {
          var select = e.target;
          if (select.value === 'addNew') {
            if (sF.modal.initialized) {
              sF.lastUsedSelect = e.target;
              sF.modal.open(select.getAttribute('data-type'));
            } else {
              console.log('Error: can\'t open modal window.');
            }
          } else {
            var order = select.getAttribute('data-order');
            sF.section.isValid(order);
          }
        });

        cell.appendChild(select);
      },

      addRow: function() {
        if (sF.section.initialized === true) {
          var row = sF.section.mainTable.insertRow(sF.section.counter);
          var cell = row.insertCell(0);
          cell.innerHTML = sF.section.counter;

          var names = ['projection','height','ratio'],
              name = null;

          for (var i=1; i<4; i++) {
            cell = row.insertCell(i);
            sF.section.addInput(cell,names[i - 1]);
          }

          cell = row.insertCell(4);
          sF.section.addSelect(cell,'measures');

          cell = row.insertCell(5);
          sF.section.addSelect(cell,'surfaces');

          cell = row.insertCell(6);
          cell.innerHTML = '<span class="jsf-status-row"><span class="icon-checkmark"></span><span class="icon-cross"></span></span>';

          sF.addClass(row,'jsf-invalid');

          sF.section.counter++;
        }
      },

      init: function() {
        if (sF.section.initialized === false) {
          sF.section.mainTable = document.getElementById('jsf-main-table');
          if ((sF.section.mainTable) && ((sF.section.mainTable.tagName === 'table') || (sF.section.mainTable.tagName === 'TABLE'))) {
            sF.section.addButton = document.getElementById('jsf-section-add');
            if (sF.section.addButton) {

              sF.section.addButton.addEventListener('click', function(e) {
                e.preventDefault();
                sF.section.addRow(e);
              });

              sF.section.initialized = true;

              for (var i = 0; i < 5; i++) {
                sF.section.addRow();
              }

            } else {
              console.log('Error: Section button missing.');
            }
          } else {
            console.log('Error: Section table missing.');
          }
        }
      }
    },

    rainfall: {
      initialized: false,
      mainSelect: null,
      userValuesTable: null,
      fifteenInput: null, // TODO TO INPUT
      addNewUserDataRow: null,
      addUserDataButton: null,
      addButton: null,
      addFifteenButton: null,
      counter: 0,
      data: [0, 0],
      timeInput: null,
      rainfallInput: null,

      ifAnyData: function() {
        if (sF.userRainFalls.length > 1) {
          return true;
        }
        return false;
      },

      validatingUserValues: function() {
        var order = sF.rainfall.counter + 1;
        if (sF.rainfall.validateUserValues()) {
          sF.markRow(sF.rainfall.userValuesTable,order,'valid');
        } else {
          sF.markRow(sF.rainfall.userValuesTable,order,'invalid');
        }
      },

      validateUserValues: function() {
        var timeValue = sF.rainfall.timeInput.value,
            rainfallValue = sF.rainfall.rainfallInput.value,
            error = false;

        for (var i=0; i<sF.userRainFalls.length; i++) {
          if (sF.userRainFalls[i][0] >= timeValue) {
            error = true;
          }
          if (sF.userRainFalls[i][1] >= rainfallValue) {
            error = true;
          }
        }

        if ((!timeValue) || (isNaN(timeValue)) || (!rainfallValue) || (isNaN(rainfallValue)) || (timeValue < 0) || (timeValue == 0) || (rainfallValue < 0) || (rainfallValue == 0)) {
          error = true;
        }

        if (error === true) {
          return false;
        } else {
          return true;
        }
      },

      addInput: function(cell,column) {
        var input = document.createElement('INPUT'),
            inputName = 'rainfall-' + column;

        input.setAttribute('type', 'number');
        input.setAttribute('name', inputName);

        switch (column) {
          case 'time':
            input.setAttribute('step', '1');
            input.setAttribute('min', '1');
            break;
          case 'rainfall':
            input.setAttribute('step', '0.01');
            input.setAttribute('min', '0.01');
            break;
        }

        input.setAttribute('size', 6);

        input.addEventListener('input', function() {
          sF.rainfall.validatingUserValues();
        });

        cell.appendChild(input);

        if (column === 'time') {
          sF.rainfall.timeInput = input;
        } else if (column === 'rainfall') {
          sF.rainfall.rainfallInput = input;
        }

      },

      restartUsersValues: function() {
        sF.userRainFalls = [];
        sF.userRainFalls.push([0,0]);
        sF.rainfall.refillUserValues();
      },

      refillUserValues: function() {
        var tableRows = sF.rainfall.userValuesTable.getElementsByTagName('TR'),
            rowsParentNode = tableRows[0].parentNode,
            rowsNumber = tableRows.length;

        for (var i=0; i<rowsNumber; i++) {
          rowsParentNode.removeChild(rowsParentNode.lastChild);
        }

        sF.rainfall.fillUserValues();
      },

      fillUserValues: function() {
        if (sF.rainfall.initialized === true) {

          // table header
          row = sF.rainfall.userValuesTable.insertRow();
          cell = row.insertCell(0);
          cell.innerHTML = sF.dictionary.getValue('time_minutes');
          cell = row.insertCell(1);
          cell.innerHTML = sF.dictionary.getValue('cumulative_deduction');

          // table data - rows
          for (var i = 0; i < sF.userRainFalls.length; i++) {
            row = sF.rainfall.userValuesTable.insertRow();

            // table data - cells
            cell = row.insertCell(0);
            cell.innerHTML = sF.userRainFalls[i][0];
            cell = row.insertCell(1);
            cell.innerHTML = sF.userRainFalls[i][1];
          }

          row = sF.rainfall.userValuesTable.insertRow();
          cell = row.insertCell(0);
          sF.rainfall.addInput(cell,'time');
          cell = row.insertCell(1);
          sF.rainfall.addInput(cell,'rainfall');


          sF.rainfall.counter = i;
        }
      },

      addNewUserValues: function() {
          sF.userRainFalls.push([parseFloat(sF.rainfall.timeInput.value), parseFloat(sF.rainfall.rainfallInput.value)]);
          sF.rainfall.refillUserValues();
          sF.rainfall.setSetupButton('user');
          ((sF.debbuging) ? console.log('Info: Adding new user Values') : null);
      },

      validatingFifteenValue: function() {
        if (sF.rainfall.validateFifteenValue()) {
          sF.markRow(sF.rainfall.fifteenTable,0,'valid');
        } else {
          sF.markRow(sF.rainfall.fifteenTable,0,'invalid');
        }
      },

      validateFifteenValue: function() {
        var val = sF.rainfall.fifteenInput.value;
        if ((!val) || (isNaN(val)) || (val < 0) || (val == 0)) {
          return false;
        } else {
          return true;
        }
      },

      setFiveteenInput: function() {
        sF.rainfall.fifteenInput.setAttribute('type', 'number');
        sF.rainfall.fifteenInput.setAttribute('name', 'fifteen-input');
        sF.rainfall.fifteenInput.setAttribute('step', '0.01');
        sF.rainfall.fifteenInput.setAttribute('min', '0');
        sF.rainfall.fifteenInput.setAttribute('size', 6);
      },

      setSetupButton: function(action) {
        if (action === false) {
          sF.removeClass(sF.rainfall.setupButton,'jsf-enabled');
          sF.addClass(sF.rainfall.setupButton,'jsf-disabled');
        } else {
          sF.removeClass(sF.rainfall.setupButton,'jsf-disabled');
          sF.addClass(sF.rainfall.setupButton,'jsf-enabled');
          sF.rainfall.setupButton.setAttribute('data-action',action);
        }
      },

      init: function() {
        if (sF.rainfall.initialized === false) {
          sF.rainfall.mainSelect = document.getElementById('jsf-rainfall-select');
          if ((sF.rainfall.mainSelect) && ((sF.rainfall.mainSelect.tagName === 'select') || (sF.rainfall.mainSelect.tagName === 'SELECT'))) {
            sF.rainfall.userValuesTable = document.getElementById('jsf-rainfall-user-table');
            if ((sF.rainfall.userValuesTable) && ((sF.rainfall.userValuesTable.tagName === 'table') || (sF.rainfall.userValuesTable.tagName === 'TABLE'))) {
              sF.rainfall.fifteenTable = document.getElementById('jsf-rainfall-fifteen-table');
              if ((sF.rainfall.fifteenTable) && ((sF.rainfall.fifteenTable.tagName === 'table') || (sF.rainfall.fifteenTable.tagName === 'TABLE'))) {
                sF.rainfall.fifteenInput = document.getElementById('jsf-fifteen-input');
                if ((sF.rainfall.fifteenInput) && ((sF.rainfall.fifteenInput.tagName === 'input') || (sF.rainfall.fifteenInput.tagName === 'INPUT'))) {
                  sF.rainfall.addNewUserDataRow = document.getElementById('jsf-rainfall-row-add');
                  sF.rainfall.addUserDataButton = document.getElementById('jsf-rainfall-user-add');
                  sF.rainfall.addFifteenButton = document.getElementById('jsf-rainfall-fifteen-add');
                  sF.rainfall.setupButton = document.getElementById('jsf-rainfall-setup');
                  sF.rainfall.restartButton = document.getElementById('jsf-rainfall-restart');
                  if ((sF.rainfall.addNewUserDataRow) && (sF.rainfall.addUserDataButton) && (sF.rainfall.addFifteenButton) && (sF.rainfall.setupButton)) {

                    sF.userRainFalls.push([0,0]);
                    sF.rainfall.setFiveteenInput();

                    sF.rainfall.mainSelect.addEventListener('change', function(e) {
                      var select = e.target;
                      sF.lastUsedSelect = e.target;

                      if (sF.modal.initialized) {
                        switch (select.value) {
                          case 'user':
                            sF.modal.open('rainfall-user');
                            sF.rainfall.setSetupButton('user');
                            break;
                          case 'fifteen':
                            sF.modal.open('rainfall-fifteen');
                            sF.rainfall.setSetupButton('fifteen');
                            break;
                        }
                      } else {
                        console.log('Error: can\'t open modal window.');
                      }
                    });

                    sF.rainfall.addNewUserDataRow.addEventListener('click', function() {
                      if (sF.rainfall.validateUserValues()) {
                        sF.rainfall.addNewUserValues();
                      } else {
                        sF.rainfall.validatingUserValues();
                      }
                    });

                    sF.rainfall.addUserDataButton.addEventListener('click', function() {
                      if (sF.rainfall.validateUserValues()) {
                        sF.rainfall.addNewUserValues();
                        sF.modal.close(false);
                      }
                      if (sF.rainfall.ifAnyData()) {
                        sF.modal.close(false);
                      } else {
                        sF.modal.close(true);
                      }
                    });

                    sF.rainfall.fifteenInput.addEventListener('input', function() {
                      sF.rainfall.validatingFifteenValue();
                    });

                    sF.rainfall.addFifteenButton.addEventListener('click', function() {
                      if (sF.rainfall.validateFifteenValue()) {
                        sF.fifteenRainFallValue = sF.rainfall.fifteenInput.value;
                        sF.rainfall.setSetupButton('fifteen');
                        sF.modal.close(false);
                      } else {
                        sF.modal.close(true);
                      }
                    });

                    if (sF.rainfall.restartButton) {
                      sF.rainfall.restartButton.addEventListener('click', function() {
                        sF.rainfall.restartUsersValues();
                      });
                    }

                    sF.removeClass(sF.rainfall.setupButton,'jsf-enabled');
                    sF.addClass(sF.rainfall.setupButton,'jsf-disabled');

                    sF.rainfall.setupButton.addEventListener('click', function() {
                      if (sF.hasClass(sF.rainfall.setupButton,'jsf-enabled')) {
                        var action = sF.rainfall.setupButton.getAttribute('data-action');
                        switch (action) {
                          case 'user':
                            sF.modal.open('rainfall-user');
                            break;
                          case 'fifteen':
                            sF.modal.open('rainfall-fifteen');
                            break;
                        }
                      }
                    });

                    sF.rainfall.initialized = true;

                    sF.rainfall.fillUserValues();
                  } else {
                    console.log('Error: some rainfall button missing.');
                  }
                } else {
                  console.log('Error: rainfall fifteen input missing.');
                }
              } else {
                console.log('Error: rainfall fifteen table missing.');
              }
            } else {
              console.log('Error: rainfall user table missing.');
            }
          } else {
            console.log('Error: rainfall select missing.');
          }
        }
      }
    },

    outputs: {
      accepted: false,
      profileCsvData: '',
      hydrographCsvData: '',
      hdgTime: [],
      hdgDeltaTime: [],
      hdgRain: [],
      hdgTotalWaterLevel: [],
      hdgSurfaceFlow: [],
      hdgSurfaceVolRunoff: [],
      prfLength: [],
      prfSoilveg: [],
      prfMaximalSrfFlow: [],
      prfTotalRunoff: [],
      prfMaxSrfRunoffVelocity: [],
      prfMaxTangentialStress: [],
      prfRillRunoff: []
    },

    charts: {
      hdrChartOne: null,
      hdrChartTwo: null,
      prfChartOne: null,

      generateData: function() {
        if (sF.outputs.accepted) {
          var row = [],
              cell = [];

          sF.outputs.hdgTime = [];
          sF.outputs.hdgDeltaTime = [];
          sF.outputs.hdgRain = [];
          sF.outputs.hdgTotalWaterLevel = [];
          sF.outputs.hdgSurfaceFlow = [];
          sF.outputs.hdgSurfaceVolRunoff = [];
          sF.outputs.prfLength = [];
          sF.outputs.prfSoilveg = [];
          sF.outputs.prfMaximalSrfFlow = [];
          sF.outputs.prfTotalRunoff = [];
          sF.outputs.prfMaxSrfRunoffVelocity = [];
          sF.outputs.prfMaxTangentialStress = [];
          sF.outputs.prfRillRunoff = [];

          row = sF.outputs.hydrographCsvData.split('\n');
          for (var i = 1; i < row.length; i++) {
            cell = row[i].split(';');
            if (!isNaN(parseFloat(cell[0]))) {
              sF.outputs.hdgTime.push(parseFloat(cell[0]).toFixed(0));
              sF.outputs.hdgDeltaTime.push(parseFloat(cell[1]));
              sF.outputs.hdgRain.push(parseFloat(cell[2]));
              sF.outputs.hdgTotalWaterLevel.push(parseFloat(cell[3]));
              sF.outputs.hdgSurfaceFlow.push(parseFloat(cell[4]));
              sF.outputs.hdgSurfaceVolRunoff.push(parseFloat(cell[5]).toFixed(20));
            }
          }

          row = sF.outputs.profileCsvData.split('\n');
          for (var i = 0; i < row.length; i++) {
            cell = row[i].split(',');
            if (!isNaN(parseFloat(cell[0]))) {
              sF.outputs.prfLength.push(parseFloat(cell[0]));
              sF.outputs.prfSoilveg.push(cell[1]);
              sF.outputs.prfMaximalSrfFlow.push(parseFloat(cell[2]));
              sF.outputs.prfTotalRunoff.push(parseFloat(cell[3]));
              sF.outputs.prfMaxSrfRunoffVelocity.push(parseFloat(cell[4]));
              sF.outputs.prfMaxTangentialStress.push(parseFloat(cell[5]));
              sF.outputs.prfRillRunoff.push(parseFloat(cell[6]));
            }
          }

          return true;
        }
        return false;
      },

      createCharts: function() {
        if ((sF.outputs.accepted) && (typeof Chart != 'undefined') && (sF.charts.generateData())) {

          var ctx = document.getElementById('jsf-surfaceVolRunoff');

          sF.charts.hdrChartOne = new Chart(ctx, {
            type: 'line',
            data: {
              labels: sF.outputs.hdgTime,
              datasets: [{
                label: 'surfaceVolRunoff[m3]',
                backgroundColor: 'rgba(255,0,0,0)',
                pointRadius: 0,
                borderColor: 'rgba(0,0,255,0.8)',
                borderWidth: 3,
                data: sF.outputs.hdgSurfaceVolRunoff
              }]
            },
            options: {
              title: {
                display: true,
                text: 'Hydrogram chart 1'
              },
              scales: {
                yAxes: [{
                  ticks: {
                      beginAtZero: true
                  }
                }]
              }
            }
          });

          var ctx2 = document.getElementById('jsf-surfaceChartTwo');

          sF.charts.hdrChartTwo = new Chart(ctx2, {
            type: 'line',
            data: {
              labels: sF.outputs.hdgTime,
              datasets: [{
                label: 'surfaceFlow[m3/s]',
                backgroundColor: 'rgba(255,0,0,0)',
                pointRadius: 0,
                borderColor: 'rgba(255,0,0,0.8)',
                borderWidth: 3,
                data: sF.outputs.hdgSurfaceFlow
              }, {
                label: 'rainfall[m]',
                backgroundColor: 'rgba(255,0,0,0)',
                pointRadius: 0,
                borderColor: 'rgba(0,255,0,0.8)',
                borderWidth: 3,
                data: sF.outputs.hdgRain
              }]
            },
            options: {
              title: {
                display: true,
                text: 'Hydrogram chart 2'
              },
            }
          });

          var ctx3 = document.getElementById('jsf-profileChartOne');

          sF.charts.prfChartOne = new Chart(ctx3, {
            type: 'line',
            data: {
              labels: sF.outputs.prfLength,
              datasets: [{
                label: 'MaximalSurfaceFlow [m3/s]',
                backgroundColor: 'rgba(255,0,0,0)',
                pointRadius: 0,
                borderColor: 'rgba(255,0,0,0.8)',
                borderWidth: 3,
                data: sF.outputs.prfMaximalSrfFlow
              }]
            },
            options: {
              title: {
                display: true,
                text: 'MaximalSurfaceFlow [m3/s]'
              },
            }
          });

        }
      },

      removeAllData: function(chart) {
        chart.data.labels = [];
        chart.data.datasets.forEach((dataset) => {
          dataset.data = [];
        });
        chart.update();
      },

      updateCharts: function() {
        if ((sF.outputs.accepted) && (typeof Chart != 'undefined') && (sF.charts.generateData())) {

          sF.charts.removeAllData(sF.charts.hdrChartOne);
          sF.charts.removeAllData(sF.charts.hdrChartTwo);
          sF.charts.removeAllData(sF.charts.prfChartOne);

          sF.charts.hdrChartOne.data.labels = sF.outputs.hdgTime;
          sF.charts.hdrChartOne.data.datasets[0].data = sF.outputs.hdgSurfaceVolRunoff;
          sF.charts.hdrChartOne.update();

          sF.charts.hdrChartTwo.data.labels = sF.outputs.hdgTime;
          sF.charts.hdrChartTwo.data.datasets[0].data = sF.outputs.hdgSurfaceFlow;
          sF.charts.hdrChartTwo.data.datasets[1].data = sF.outputs.hdgRain;
          sF.charts.hdrChartTwo.update();

          sF.charts.prfChartOne.data.labels = sF.outputs.prfLength;
          sF.charts.prfChartOne.data.datasets[0].data = sF.outputs.prfMaximalSrfFlow;
          sF.charts.prfChartOne.update();
        }
      },

      init: function() {

      }
    },

    loader: {
      initialized: false,
      mainBox: null,

      quickHide: function(destination) {
        if (destination.hasAttribute('data-loader-showing')) {
          var loaders = destination.getElementsByClassName('jsf-loader');
          for (var i = 0; i < loaders.length; i++) {
            loaders[i].remove();
          }
          destination.removeAttribute("data-loader-showing");
        }
      },

      hide: function(destination) {
        if (destination.hasAttribute('data-loader-showing')) {
          setTimeout(function() {
            var loaders = destination.getElementsByClassName('jsf-loader');
            for (var i = 0; i < loaders.length; i++) {
              loaders[i].remove();
            }
          }, 1000);
          destination.removeAttribute("data-loader-showing");
        }
      },

      updatePercents: function(destination, percent) {
        if (destination.hasAttribute('data-loader-showing')) {
          var showingPercent = 0;

          var loaders = destination.getElementsByClassName('jsf-loader');
          for (var i = 0; i < loaders.length; i++) {
            var percentDivs = loaders[i].getElementsByClassName('jsf-loader-percent');
            for (var j = 0; j < percentDivs.length; j++) {
              if ((percent > 80) && (percent < 90)) {
                showingPercent = percent + 10;
              } else if (percent > 90) {
                showingPercent = 100;
              } else {
                showingPercent = percent;
              }
              percentDivs[j].style.width = showingPercent + '%';
            }
            var numberDivs = loaders[i].getElementsByClassName('jsf-loader-number');
            for (var k = 0; k < numberDivs.length; k++) {
              numberDivs[k].innerHTML = percent + '%';
            }
          }
        } else {
          console.log('Warning: reopen existing loader.');
        }
      },

      show: function(destination) {
        if (!destination.hasAttribute('data-loader-showing')) {
          var loader = document.createElement('div'),
              loaderSymbol = document.createElement('div'),
              div = null;

          loader.className = 'sf-loader jsf-loader';
          loaderSymbol.className = 'sf-loader__symbol';

          for (var i=0; i<2; i++) {
            div = document.createElement('div');
            loaderSymbol.appendChild(div);
          }

          loader.appendChild(loaderSymbol);

          var scaleDiv = document.createElement('div');
          scaleDiv.className = 'sf-loader__scale';

          var percentDiv = document.createElement('div');
          percentDiv.className = 'sf-loader__percent jsf-loader-percent';

          scaleDiv.appendChild(percentDiv);
          loader.appendChild(scaleDiv);

          var numberDiv = document.createElement('div');
          numberDiv.className = 'sf-loader__number jsf-loader-number';

          loader.appendChild(numberDiv);

          setTimeout(function() {
            if (loader.tagName) {
              sF.addClass(loader,'jsf-open');
            }
          }, 1000);

          destination.appendChild(loader);
          destination.setAttribute('data-loader-showing', 'true');
        }
      },

      init: function() {
        var mainEl = document.getElementById('jsf-mainbox');
        if (mainEl.tagName) {
          sF.loader.mainBox = mainEl;
          sF.loader.initialized = true;
        }
      }
    },

    postman: {
      lastRequestXML: false,
      initialized: false,
      finalXML: null,
      button: null,
      statusLocation: null,
      timeout: null,
      state: null,
      attempts: 0,
      delay: 3000,

      getIniData: function() {
        var res = null,
            slopeWidth = null,
            maxdt = null,
            endtime = null;

        var resolutionInput = document.getElementById('resolution'),
            simulationLengthInput = document.getElementById('simulation-length'),
            maxdtInput = document.getElementById('maxdt'),
            slopeWidthInput = document.getElementById('slope-width');

        ((resolutionInput) ? res = parseFloat(resolutionInput.value) : res = sF.defaultRes);
        ((simulationLengthInput) ? endtime = parseInt(simulationLengthInput.value) : endtime = sF.defaultEndtime);
        ((maxdtInput) ? maxdt = parseInt(maxdtInput.value) : maxdt = sF.defaultMaxdt);
        ((slopeWidthInput) ? slopeWidth = parseInt(slopeWidthInput.value) : slopeWidth = sF.defaultslopeWidth);

        ((res < sF.defaultResMin) ? res = sF.defaultResMin : null);
        ((res > sF.defaultResMax) ? res = sF.defaultResMax : null);
        ((endtime < sF.defaultEndtimeMin) ? endtime = sF.defaultEndtimeMin : null);
        ((endtime > sF.defaultEndtimeMax) ? endtime = sF.defaultEndtimeMax : null);
        ((maxdt < sF.defaultMaxdtMin) ? maxdt = sF.defaultMaxdtMin : null);
        ((maxdt > sF.defaultMaxdtMax) ? maxdt = sF.defaultMaxdtMax : null);
        ((slopeWidth < sF.defaultSlopeWidthMin) ? slopeWidth = sF.defaultSlopeWidthMin : null);
        ((slopeWidth > sF.defaultSlopeWidthMax) ? slopeWidth = sF.defaultSlopeWidthMax : null);

        return {
          'res': res,
          'slopeWidth': slopeWidth,
          'maxdt': maxdt,
          'endtime': endtime
        }
      },

      getSelectionsData: function() {
        var str = '',
            retString = '',
            actualProjectionInput = null,
            actualHeightInput = null,
            actualMeasuresInput = null,
            actualSurfacesInput = null,
            actualProjectionValue = null,
            actualHeightValue = null,
            //actualRatioNumber = 0,
            actualMeasuresValue = null,
            actualSurfacesValue = null;

        for (var i = 1; i < sF.section.counter; i++) {
          actualProjectionInput = document.getElementsByName('projection-' + i)[0];
          actualHeightInput = document.getElementsByName('height-' + i)[0];
          actualMeasuresInput = document.getElementsByName('measures-' + i)[0];
          actualSurfacesInput = document.getElementsByName('surfaces-' + i)[0];

          actualProjectionValue = parseFloat(actualProjectionInput.value);
          actualHeightValue = parseFloat(actualHeightInput.value);
          actualMeasuresValue = actualMeasuresInput.value;
          actualSurfacesValue = actualSurfacesInput.value;

          if ((actualProjectionValue > 0) && (actualHeightValue>0) && (actualMeasuresValue != 'needSelect') && (actualSurfacesValue != 'needSelect')) {
            str = actualProjectionValue + ';' + actualHeightValue + ';' + actualMeasuresValue + ';' + actualSurfacesValue + '\n';
            retString += str;
          }
        }

        return retString;
      },

      getSoilTypes: function() {
        var str = '',
            retString = '',
            fifteen = false,
            rainfallSelect = document.getElementById('jsf-rainfall-select');

        (((rainfallSelect) && (rainfallSelect.value === 'fifteen')) ? fifteen = true : fifteen = false);

        for (var i=0; i < sF.meSu.counters['surfaces']; i++) {
          for (var j=0; j < sF.meSu.counters['measures']; j++) {
            if (!fifteen) {
              str = sF.surfaces[i]['code'] + sF.measures[j]['code'] + ';' +
                    parseFloat(sF.surfaces[i]['k']).toFixed(sF.nDecPlc['k']) + ';' +
                    parseFloat(sF.surfaces[i]['s']).toFixed(sF.nDecPlc['s']) + ';' +
                    parseFloat(sF.measures[j]['n']).toFixed(sF.nDecPlc['n']) + ';' +
                    parseFloat(sF.measures[j]['pi']).toFixed(sF.nDecPlc['pi']) + ';' +
                    parseFloat(sF.measures[j]['ppl']).toFixed(sF.nDecPlc['ppl']) + ';' +
                    parseFloat(sF.measures[j]['ret']).toFixed(sF.nDecPlc['ret']) + ';' +
                    parseFloat(sF.surfaces[i]['b']).toFixed(sF.nDecPlc['b']) + ';' +
                    parseFloat(sF.surfaces[i]['x']).toFixed(sF.nDecPlc['x']) + ';' +
                    parseFloat(sF.surfaces[i]['y']).toFixed(sF.nDecPlc['y']) + ';' +
                    parseFloat(sF.measures[j]['tau']).toFixed(sF.nDecPlc['tau']) + ';' +
                    parseFloat(sF.measures[j]['v']).toFixed(sF.nDecPlc['v']) + '\n';
            } else {
              str = sF.surfaces[i]['code'] + sF.measures[j]['code'] + ';' +
                    parseFloat(sF.surfaces[i]['k']).toFixed(sF.nDecPlc['k']) + ';' +
                    '0;' +
                    parseFloat(sF.measures[j]['n']).toFixed(sF.nDecPlc['n']) + ';' +
                    '0;' +
                    '0;' +
                    '0;' +
                    parseFloat(sF.surfaces[i]['b']).toFixed(sF.nDecPlc['b']) + ';' +
                    parseFloat(sF.surfaces[i]['x']).toFixed(sF.nDecPlc['x']) + ';' +
                    parseFloat(sF.surfaces[i]['y']).toFixed(sF.nDecPlc['y']) + ';' +
                    parseFloat(sF.measures[j]['tau']).toFixed(sF.nDecPlc['tau']) + ';' +
                    parseFloat(sF.measures[j]['v']).toFixed(sF.nDecPlc['v']) + '\n';
            }

            retString += str;
          }
        }

        return retString;
      },

      getRainfall: function() {
        var rainfallSelect = document.getElementById('jsf-rainfall-select');

        if (rainfallSelect) {
          switch (rainfallSelect.value) {
            case 'user':
              var str = '';
              for (var i = 1; i < sF.userRainFalls.length; i++) { // 1 ignore 0 0
                str += sF.userRainFalls[i][0] + ' ' + sF.userRainFalls[i][1] + '\n';
              }
              return str;
              break;
            case 'fifteen':
              return '15 ' + sF.fifteenRainFallValue;
              break;
            default:
              console.log('Error: rainfall select contains bad value.');
          }
        }

        return '';
      },

      createRequestXMLString: function() {
        var selectionsData = sF.postman.getSelectionsData(),
            iniData = sF.postman.getIniData(),
            rainfall = sF.postman.getRainfall(),
            soilTypes = sF.postman.getSoilTypes();

        var text = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
          '\t<wps:Execute service="WPS" version="1.0.0" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsExecute_request.xsd">\n' +
            '\t\t<ows:Identifier>smoderp1d</ows:Identifier>\n' +
            '\t\t<wps:DataInputs>\n' +
              '\t\t\t<wps:Input>\n' +
                '\t\t\t\t<ows:Identifier>input</ows:Identifier>\n' +
                '\t\t\t\t<wps:Data>\n' +
                  '\t\t\t\t\t<wps:ComplexData mimeType="text/csv"><![CDATA[horizontalProjection[m];verticalDistance[m];surfaceProtection;soilType\n' +
                  selectionsData + ']]></wps:ComplexData>\n' +
                '\t\t\t\t</wps:Data>\n' +
              '\t\t\t</wps:Input>\n' +
              '\t\t\t<wps:Input>\n' +
                '\t\t\t\t<ows:Identifier>soil_types</ows:Identifier>\n' +
                '\t\t\t\t<wps:Data>\n' +
                  '\t\t\t\t\t<wps:ComplexData mimeType="text/csv"><![CDATA[soilVeg;k;s;n;pi;ppl;ret;b;x;y;tau;v\n' +
                  soilTypes + ']]></wps:ComplexData>\n' +
                '\t\t\t\t</wps:Data>\n' +
              '\t\t\t</wps:Input>\n' +
              '\t\t\t<wps:Input>\n' +
                '\t\t\t\t<ows:Identifier>rainfall</ows:Identifier>\n' +
                '\t\t\t\t<wps:Data>\n' +
                  '\t\t\t\t\t<wps:ComplexData mimeType="text/plain"><![CDATA[' + rainfall + ']]></wps:ComplexData>\n' +
                '\t\t\t\t</wps:Data>\n' +
              '\t\t\t</wps:Input>\n' +
              '\t\t\t<wps:Input>\n' +
                '\t\t\t\t<ows:Identifier>config</ows:Identifier>\n' +
                '\t\t\t\t<wps:Data>\n' +
                  '\t\t\t\t\t<wps:ComplexData mimeType="text/plain"><![CDATA[[domain]\n'+
                    '\t\t\t\t\t\tres: ' + iniData.res + '\n' +
                    '\t\t\t\t\t\tslope_width: ' + iniData.slopeWidth + '\n' +
                    '\t\t\t\t\t\t[time]\n' +
                    '\t\t\t\t\t\tmaxdt: ' + iniData.maxdt + '\n' +
                    '\t\t\t\t\t\tendtime: ' + iniData.endtime + '\n' +
                '\t\t\t\t\t]]></wps:ComplexData>\n' +
                '\t\t\t\t</wps:Data>\n' +
              '\t\t\t</wps:Input>\n' +
            '\t\t</wps:DataInputs>\n' +
            '\t\t<wps:ResponseForm>\n' +
              '\t\t\t<wps:ResponseDocument lineage="true" storeExecuteResponse="true" status="true">\n' +
                '\t\t\t\t<wps:Output asreference="true" mimeType="text/csv">\n' +
                  '\t\t\t\t\t<ows:Identifier>profile</ows:Identifier>\n' +
                '\t\t\t\t</wps:Output>\n' +
                '\t\t\t\t<wps:Output asreference="true" mimeType="text/csv">\n' +
                  '\t\t\t\t\t<ows:Identifier>hydrograph</ows:Identifier>\n' +
                '\t\t\t\t</wps:Output>\n' +
              '\t\t\t</wps:ResponseDocument>\n' +
            '\t\t</wps:ResponseForm>\n' +
          '\t</wps:Execute>';

        sF.postman.lastRequestXML = text;

        return text;
      },

      processAcceptedResponse: function(xmlFile) {
        ((sF.debbuging) ? console.log('Info: process accepted, getting status location adress.') : null);

        var executeResponse = xmlFile.getElementsByTagName('wps:ExecuteResponse')[0];
        if (executeResponse.hasAttribute('statusLocation')) {
          sF.postman.statusLocation = executeResponse.getAttribute('statusLocation');
        }
      },

      processFinalStatusResponse: function() {
        ((sF.debbuging) ? console.log('Info: set loader percentage value to 100.') : null);
        ((sF.loader.initialized) ? sF.loader.updatePercents(sF.loader.mainBox,100) : null);
      },

      processStartedResponse: function(xmlFile) {
        ((sF.debbuging) ? console.log('Info: process started, display of the percentage value in loader.') : null);

        var status = xmlFile.getElementsByTagName('wps:Status')[0],
            processStarted = status.getElementsByTagName('wps:ProcessStarted');

        if (processStarted[0].hasAttribute('percentCompleted')) {
          var percentCompleted = processStarted[0].getAttribute('percentCompleted');
          ((sF.loader.initialized) ? sF.loader.updatePercents(sF.loader.mainBox,percentCompleted) : null);
          ((sF.debbuging) ? console.log('Info: percent: ' + percentCompleted) : null);
        }
      },

      processFailedResponse: function(xmlFile) {
        ((sF.debbuging) ? console.log('Info: process error response, showing error info in modal window.') : null);
        ((sF.loader.initialized) ? sF.loader.quickHide(sF.loader.mainBox) : null);

        var status = xmlFile.getElementsByTagName('wps:Status')[0],
            processFailed = status.getElementsByTagName('wps:ProcessFailed')[0],
            exceptions = processFailed.getElementsByTagName('ows:Exception'),
            code = null,
            text = null,
            summary = '';

        for (var i = 0; i < exceptions.length; i++) {
          text = exceptions[i].getElementsByTagName('ows:ExceptionText')[0].innerHTML;
          summary += text + ' Error code: ' + exceptions[i].getAttribute('exceptionCode') + ', locator: ' + exceptions[i].getAttribute('locator') + '.<br />\n';
        }

        var errorReport = document.getElementById('jsf-error-report');
        if (errorReport) {
          errorReport.innerHTML = summary;
        }

        var errorAnchorXML = document.getElementById('jsf-error-xmlswnl');
        if (errorAnchorXML) {
          var errorXML = sF.postman.lastRequestXML;
              errorXMLUri = 'data:text/plain,' + encodeURIComponent(errorXML);
          errorAnchorXML.href = errorXMLUri;
        }

        sF.modal.open('error');
      },

      processSucceededResponse: function(xmlFile) {
        sF.postman.finalXML = xmlFile;

        ((sF.debbuging) ? console.log('Info: process final response, showing and processing data in new page area.') : null);
        ((sF.loader.initialized) ? sF.loader.quickHide(sF.loader.mainBox) : null);


        var processOutputs = sF.postman.finalXML.getElementsByTagName('wps:ProcessOutputs')[0],
            outputs = processOutputs.getElementsByTagName('wps:Output'),
            outputIdentifier = null,
            outputIdentifierValue = null,
            complexData = null,
            complexDataValue = null;

        for (var i = 0; i < outputs.length; i++) {
          outputIdentifier = outputs[i].getElementsByTagName('ows:Identifier')[0];
          outputIdentifierValue = outputIdentifier.childNodes[0].textContent;
          complexData = outputs[i].getElementsByTagName('wps:ComplexData')[0];
          complexDataValue = complexData.childNodes[0].textContent;

          if ((outputIdentifierValue) && (complexDataValue)) {
            switch (outputIdentifierValue) {
              case 'profile':
                sF.outputs.profileCsvData = complexDataValue;
                break;
              case 'hydrograph':
                sF.outputs.hydrographCsvData = complexDataValue;
                break;
            }
          }
        }

        sF.mode.showResults();

        if ((sF.outputs.profileCsvData) && (sF.outputs.hydrographCsvData)) {
          if (sF.outputs.accepted === false) {
            sF.outputs.accepted = true;
            sF.charts.createCharts();
          } else {
            sF.charts.updateCharts();
          }

          // creating data anchors
          var profileAnchor = document.getElementById('jsf-profile-achor');
          if (profileAnchor) {
            var profileUri = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(sF.outputs.profileCsvData);
            profileAnchor.href = profileUri;
          }

          var hydrographAnchor = document.getElementById('jsf-hydrograph-achor');
          if (hydrographAnchor) {
            var hydrographUri = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(sF.outputs.hydrographCsvData);
            hydrographAnchor.href = hydrographUri;
          }

          var wholeXmlAnchor = document.getElementById('jsf-xml-achor');
          if (wholeXmlAnchor) {
            var xmlText = new XMLSerializer().serializeToString(sF.postman.finalXML),
                wholeXmlUri = 'data:text/plain,' + encodeURIComponent(xmlText);
            wholeXmlAnchor.href = wholeXmlUri;
          }
        }
      },

      processResponse: function(xmlFile) {
        var status = xmlFile.getElementsByTagName('wps:Status')[0],
            processSucceeded = status.getElementsByTagName('wps:ProcessSucceeded'),
            processAccepted = status.getElementsByTagName('wps:ProcessAccepted'),
            processStarted = status.getElementsByTagName('wps:ProcessStarted'),
            processFailed = status.getElementsByTagName('wps:ProcessFailed');

        if (processFailed.length > 0) {
          sF.postman.state = 'failed';
          sF.postman.processFailedResponse(xmlFile);
          return true;
        }

        if (processSucceeded.length > 0) {
          sF.postman.state = 'succeeded';
          sF.postman.processFinalStatusResponse();
          setTimeout(function() {
            sF.postman.processSucceededResponse(xmlFile);
          },2000);
          return true;
        }

        if (processAccepted.length > 0) {
          sF.postman.state = 'accepted';
          sF.postman.processAcceptedResponse(xmlFile);
          sF.postman.timeout = setTimeout(function () {
            sF.postman.send(false);
          }, sF.postman.delay);

          return true;
        }

        if (processStarted.length > 0) {
          sF.postman.state = 'started';
          sF.postman.processStartedResponse(xmlFile);
          sF.postman.timeout = setTimeout(function () {
            sF.postman.send(false);
          }, sF.postman.delay);

          return true;
        }

        console.log('Error: a condition has arisen that should not be.');
      },

      sendErrorMail: function() {
        // TODO communicate witch server endpoint to send error mail.
      },

      systemFaultEcho: function() {
        sF.postman.sendErrorMail();
        ((sF.debbuging) ? console.log('Info: system fault, showing error info in modal window.') : null);
        ((sF.loader.initialized) ? sF.loader.quickHide(sF.loader.mainBox) : null);

        var errorReport = document.getElementById('jsf-error-report');
        if (errorReport) {
          errorReport.innerHTML = 'Error: computer server not responding.';
        }
        var errorAnchorXML = document.getElementById('jsf-error-xmlswnl');
        if (errorAnchorXML) {
          var errorXML = sF.postman.lastRequestXML;
              errorXMLUri = 'data:text/plain,' + encodeURIComponent(errorXML);
          errorAnchorXML.href = errorXMLUri;
        }

        sF.modal.open('error');
      },

      send: function(firstSending) {
        var fatalError = false;

        if ((sF.postman.state == 'accepted') && (sF.postman.attempts > 20)) {
          fatalError = true;
        }

        if (!fatalError) {
          var url = null,
              requestXmlString = null;

          if (firstSending) {
            sF.postman.state = '';
            ((sF.debbuging) ? console.log('Info: first sending; creating request XML and sending it to server (communicating with endpoint). Showing loader.') : null);
            ((sF.loader.initialized) ? sF.loader.show(sF.loader.mainBox) : null);
            url = sF.endpointUrl;
            requestXmlString = sF.postman.createRequestXMLString();
            sF.postman.attempts = 0;
          } else {
            ((sF.debbuging) ? console.log('Info: resending to the server (comunicating with status location). Attempt: ' + sF.postman.attempts) : null);
            url = sF.postman.statusLocation;
            sF.postman.attempts++;
          }

          var xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            if ((xhttp.readyState == 4) && (xhttp.status == 200)) {
              sF.postman.processResponse(xhttp.responseXML);
            }
          };
          if (firstSending) {
            xhttp.open('POST', url, true);
            xhttp.setRequestHeader('Content-Type', 'text/xml');
            xhttp.send(requestXmlString);
          } else {
            xhttp.open('GET', url, true);
            xhttp.send();
          }
        } else {
          sF.postman.systemFaultEcho();
        }
      },

      init: function() {
        if (sF.postman.initialized === false) {
          sF.postman.button = document.getElementById('jsf-postman');
          if (sF.postman.button) {
            sF.postman.button.addEventListener('click', function() {
              sF.postman.send(true);
            });

            sF.postman.initialized = true;
          } else {
            console.log('Error: Postman button missing.');
          }
        }
      }
    },

    dictionary: {
      getValue: function(code) {
        if (sF.dictionaryJSON[code]) {
          return sF.dictionaryJSON[code];
        }
        return code;
      },

      processAndStartInit: function(dictionary) {
        sF.dictionaryJSON = dictionary;

        for (var i = 0; i < sF.globalColumnTexts['measures'].length; i++) {
          sF.globalColumnTexts['measures'][i] = sF.dictionary.getValue(sF.globalColumnTexts['measures'][i]);
        }

        for (var i = 0; i < sF.globalColumnTexts['surfaces'].length; i++) {
          sF.globalColumnTexts['surfaces'][i] = sF.dictionary.getValue(sF.globalColumnTexts['surfaces'][i]);
        }

      // TODO přejmenování opatřeních podle slovníku
      //  var i = 0,
      //  obj = null;
      //  while (sF.measures[i]) {
      //    sF.measures[i]['name'] = sF.dictionary.getValue(sF.measures[i]['name']);
      //    i++;
      //  }

      // TODO přejmenování povrchů podle slovníku
      //  var i = 0;
      //  while (sF.surfaces[i]) {
      //    sF.surfaces[i]['name'] = sF.dictionary.getValue(sF.surfaces[i]['name']);
      //    i++;
      //  }

        sF.initAfterDictionaryLoaded();
      },

      getDictionary: function() {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if ((xhttp.readyState == 4) && (xhttp.status == 200)) {
            var dictionary = JSON.parse(this.responseText);
            sF.dictionary.processAndStartInit(dictionary);
          }
        };
        xhttp.open("GET", sF.dictionaryUrl, true);
        xhttp.send();
      },

      setDictionary: function() {
        var text = '{"smoderp":"SMODERP","epizodni_model":"Epizodn\u00ed hydrologicko-erozn\u00ed model","ms_name":"N\u00e1zev","ms_code":"K\u00f3d","ms_roughness":"Drsnost podle Maninga","ms_captured":"Zachycen\u00e9 mno\u017estv\u00ed vody opat\u0159en\u00edm [mm]","ms_ratio":"Pom\u011br zachycen\u00ed [-]","ms_retention":"Povrchov\u00e1 retence [mm]","ms_tangential":"Maxim\u00e1ln\u00ed te\u010dn\u00e9 nap\u011bt\u00ed [Pa]","ms_maxspeed":"Maxim\u00e1ln\u00ed rychlost [m\/s)]","ms_non":"Bez opat\u0159en\u00ed","ms_geo":"Geotextilie","ms_pvc":"PVC","srf_name":"N\u00e1zev","srf_code":"K\u00f3d","srf_clay":"Hlinit\u00e1","srf_clay_sandy":"Hlinitop\u00eds\u010dit\u00e1","srf_usda":"Hlinin\u00e1 (USDA)","choose":"Vyberte","add_another":"P\u0159idej dal\u0161\u00ed","distinction":"Rozli\u0161en\u00ed","sim_length":"D\u00e9lka simnulace","maximum_dt":"Maxim\u00e1ln\u00ed dt","slope_width":"\u0160\u00ed\u0159ka svahu","rainfall":"Sr\u00e1\u017eka","choose_select":"Vyberte mo\u017enost","user_rainfall":"U\u017eivatelsk\u00e1 sr\u00e1\u017eka","max_fifteen_minutes":"Maxim\u00e1ln\u00ed 15ti minutov\u00fd d\u00e9\u0161t","rainfall_by_location":"V\u00fdb\u011br sr\u00e1\u017eky podle polohy","setup":"Nastavit","section_number":"\u010c\u00edslo \u00faseku","projection":"Pr\u016fm\u011bt [m]","height_meters":"V\u00fd\u0161ka [m]","ratio":"Pom\u011br","protective_measures":"Ochrann\u00e9 oprat\u0159en\u00ed","soil":"P\u016fda","add_row":"P\u0159idat \u0159\u00e1dek","count":"Spo\u010d\u00edtej","add_measures":"P\u0159idat vlastn\u00ed ochrann\u00e9 opat\u0159en\u00ed","add":"P\u0159idat","add_surface":"P\u0159idej vlastn\u00ed p\u016fdu","delete_all":"V\u0161e smazat","ok":"OK","fifteen_rain":"15ti minutov\u00fd d\u00e9\u0161\u0165","max_rain":"Maxim\u00e1ln\u00ed intenzita 15ti minutov\u00e9ho de\u0161t\u011b","general_data":"Obecn\u00e1 data","time_minutes":"\u010cas [min]","cumulative_deduction":"Kumulativn\u00ed sr\u00e1\u017eka [mm]"}';
        var dictionary = JSON.parse(text);
        sF.dictionary.processAndStartInit(dictionary);
      },

      init: function() {
        if (!window.location.hostname) {
          sF.dictionary.setDictionary();
        } else if (window.location.hostname == 'localhost') {
          var url = window.location.href;
          sF.dictionaryUrl = url.substring(0, url.lastIndexOf("/")) + '/dictionary.json';
          sF.dictionary.getDictionary();
        } else {
          sF.dictionaryUrl = window.location.protocol + '//' + window.location.hostname + '/ep.php?get=dictionary';
          sF.dictionary.getDictionary();
        }
      }
    },

    loadDataTables: {
      surfacesCsv: 'Medium fine (FAO);MF;0.00000026389;0.00011619000;1.79250000000;9.20430000000;0.46220000000\n' +
        'Medium(FAO);ME;0.00000138889;0.00030983900;1.73850000000;10.08410000000;0.56130000000\n' +
        'Very fine (FAO);VF;0.00000166667;0.00012909900;1.66650000000;11.25710000000;0.63580000000\n' +
        'Fine (FAO);FF;0.00000277778;0.00004745900;1.70250000000;10.67060000000;0.60280000000\n' +
        'Coarse (FAO);CO;0.00000694444;0.00009745900;1.79250000000;9.20430000000;0.46220000000\n' +
        'NonSoil;N;0.00000000000;0.00000000000;1.58470000000;7.98480000000;0.48890000000\n' +
        'Jíl (N);J0;0.00000016600;0.00010328000;1.61850000000;12.03910000000;0.67170000000\n' +
        'Jílovitá (N);JJ;0.00000016600;0.00010328000;1.66650000000;11.25710000000;0.63580000000\n' +
        'Jílovitohlinitá (N);JH;0.00000025000;0.00011619000;1.70250000000;10.67060000000;0.60280000000\n' +
        'Hlinitá půda (N);HH;0.00000166600;0.00012909900;1.73850000000;10.08410000000;0.56130000000\n' +
        'Písčitohlinitá (Novák);PH;0.00000166600;0.00012909900;1.73850000000;10.08410000000;0.56130000000\n' +
        'Hlinitopísčitá půda (N);HP;0.00000366600;0.00007745900;1.79250000000;9.20430000000;0.46220000000\n' +
        'Písčitá (Novák);PP;0.00001666600;0.00019364900;1.81650000000;8.81330000000;0.36610000000\n' +
        'Silt loam (USDA);SIL;0.00000013889;0.00010328000;1.73850000000;10.08410000000;0.56130000000\n' +
        'Silt (USDA);SI;0.00000016667;0.00010328000;1.73850000000;10.08410000000;0.56130000000\n' +
        'Silty clay loam )USDA);SICL;0.00000016667;0.00010328000;1.70250000000;10.67060000000;0.60280000000\n' +
        'Loamy sand (USDA);LS;0.00000100000;0.00012909900;1.81650000000;8.81330000000;0.36610000000\n' +
        'Sand (USDA);SS;0.00000100000;0.00012909900;1.81650000000;8.81330000000;0.36610000000\n' +
        'Loam (USDA);LL;0.00000166667;0.00012909900;1.73850000000;10.08410000000;0.56130000000\n' +
        'Clay loam (USDA);CL;0.00000194444;0.00004745900;1.70250000000;10.67060000000;0.60280000000\n' +
        'Silty caly (USDA);SIC;0.00000194444;0.00004745900;1.66650000000;11.25710000000;0.63580000000\n' +
        'Clay (USDA);CC;0.00000194444;0.00024528900;1.81650000000;8.81330000000;0.36610000000\n' +
        'Sandy clay (USDA);SC;0.00000513889;0.00009745900;1.66650000000;11.25710000000;0.63580000000\n' +
        'Sandy caly loam(USDA);SCL;0.00000513889;0.00009745900;1.70250000000;10.67060000000;0.60280000000\n' +
        'Sandy loam (USDA);SL;0.00000513889;0.00009745900;1.79250000000;9.20430000000;0.46220000000',
      measuresCsv: 'Textilie z mixu přírodních a rychle se rozpadájicích umělých vláken;TLtD;0.035;0.75;0.2;2;48;1.15\n' +
        'Síť z mixu přírodních a rychle se rozpadájicích umělých vláken;NtD;0.035;0.75;0.2;2;72;1.44\n' +
        'Textilie z mixu přírodních a rychle se rozpadájicích umělých vláken;TNaD;0.035;0.75;0.2;2;96;1.92\n' +
        'Netkaná textilie;TNoD;0.035;0.05;0.25;2;96;1.92\n' +
        'Pletená textilie;TPlD;0.035;0.05;0.25;2;108;2.16\n' +
        '3D matrace v sendviči z umělých vláken;M3DD;0.035;0.05;0.25;2;108;2.20\n' +
        'Rohož z kokosových nebo jutových vláken v kokosovém nebo jutovém sendviči;KokD;0.035;0.75;0.2;2;112;3.00\n' +
        '3D matrace;M3DT;0.035;0.05;0.25;2;96;1.90\n' +
        '3D matrace vyplněná drobný štěrkem spojeným asfaltem;MPaT;0.035;0.05;0.25;2;216;1.15\n' +
        'geomříž plochá;MPeT;0.035;0.05;0.25;2;2520;1.63\n' +
        '3D matrace;M3DT;0.035;0.05;0.25;2;240;3.00\n' +
        'trvalá výztuž drnu;DrnT;0.035;0.05;0.25;2;480;3.20\n' +
        'PP geobuňka v PP sendviči;SenT;0.035;0.05;0.25;2;191;3.80\n' +
        '3D matrace spojená s výtužným prvkem;3DST;0.035;0.05;0.25;2;960;6.10\n' +
        'geomříž s prostorově uspořádány příčnými vlákny (vlnami);GeoT;0.035;0.05;0.25;2;5760;3.74\n' +
        'holá půda bez opatřebí;BAR;0.025;0;0;1;10.66;0.25\n' +
        'plně zapojený travní porost - pravidelně sečený;GRA;0.03;0;0;0;28.7;1.80\n',
      init: function() {
        var allSurfacesTextLines = sF.loadDataTables.surfacesCsv.split('\n'),
            surfacesEntries = null,
            allMeasuresTextLines = sF.loadDataTables.measuresCsv.split('\n'),
            measuresEntries = null,
            newObj = {};

        for (var i = 0; i < allSurfacesTextLines.length; i++) {
          surfacesEntries = allSurfacesTextLines[i].split(';');

          if (surfacesEntries.length == 7) {
            newObj = {};
            newObj.name = surfacesEntries[0];
            newObj.code = surfacesEntries[1];
            newObj.k = parseFloat(surfacesEntries[2]).toFixed(sF.nDecPlc['k']);
            newObj.s = parseFloat(surfacesEntries[3]).toFixed(sF.nDecPlc['s']);
            newObj.b = parseFloat(surfacesEntries[4]).toFixed(sF.nDecPlc['b']);
            newObj.x = parseFloat(surfacesEntries[5]).toFixed(sF.nDecPlc['x']);
            newObj.y = parseFloat(surfacesEntries[6]).toFixed(sF.nDecPlc['y']);

            sF.surfaces.push(newObj);
          } else {
            console.log('Error: an incomplete surface record was ignored.');
          }
        }

        for (var i = 0; i < allMeasuresTextLines.length; i++) {
          measuresEntries = allMeasuresTextLines[i].split(';');

          if (measuresEntries.length == 8) {
            newObj = {};
            newObj.name = measuresEntries[0];
            newObj.code = measuresEntries[1];
            newObj.n = parseFloat(measuresEntries[2]).toFixed(sF.nDecPlc['n']);
            newObj.pi = parseFloat(measuresEntries[3]).toFixed(sF.nDecPlc['pi']);
            newObj.ppl = parseFloat(measuresEntries[4]).toFixed(sF.nDecPlc['ppl']);
            newObj.ret = parseFloat(measuresEntries[5]).toFixed(sF.nDecPlc['ret']);
            newObj.tau = parseFloat(measuresEntries[6]).toFixed(sF.nDecPlc['tau']);
            newObj.v = parseFloat(measuresEntries[7]).toFixed(sF.nDecPlc['v']);

            sF.measures.push(newObj);
          } else {
            console.log('Error: an incomplete measure record was ignored (name: ' + measuresEntries[0] + ')');
          }
        }
      }
    },

    initAfterDictionaryLoaded: function() {
      if (sF.mode.init()) {
        sF.mode.showForm();
        sF.section.init();
        sF.modal.init();
        sF.meSu.init('measures');
        sF.meSu.init('surfaces');
        sF.rainfall.init();
        sF.postman.init();
        sF.charts.init();

        window.onkeydown = function(e) {
          if (e.keyCode == 27) {
            if ((sF.modal.initialized === true) && (sF.modal.opened === true)) {
              sF.modal.close(true);
            }
          }
        }
      } else {
        window.alert('Fatal error. Please contact admin.');
      }
    },

    init: function() {
      sF.loader.init();
      sF.loadDataTables.init();
      sF.dictionary.init();
      sF.iniData.init();
    }
  }

if (document.readyState!='loading') sF.init();
else if (document.addEventListener) document.addEventListener('DOMContentLoaded', sF.init);
else document.attachEvent('onreadystatechange', function() {
if (document.readyState=='complete') sF.init();
});
})();
