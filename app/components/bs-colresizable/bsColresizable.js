/**
 * Created by Josef on 17.08.2016.
 */
angular.module('peping.bsColresizable', [])
	.constant('bsBreakpoints', [

		// These are the bootstrap breakpoints. They need to be ordered by width in ascending order.
		{
			label: 'xs',
			min: 0
		},
		{
			label: 'sm',
			min: 768
		},
		{
			label: 'md',
			min: 992
		},
		{
			label: 'lg',
			min: 1170
		}
	])
	.directive('bsColresizable', function($document, bsBreakpoints, $window) {
		/**
		 * @type {{label: string, min: Number}[]}
		 */
		var breakpoints = bsBreakpoints;

		/**
		 * @type {HTMLElement[]}
		 */
		const gutters = [];

		/**
		 * @type {RegExp}
		 */
		const colRegex = /\bcol-([a-z]+)-(\d+)\b/g;

		/**
		 * @type {RegExp}
		 */
		const noSizeRegex = /\bcol-noresize\b/g;

		/**
		 * @type {string}
		 */
		const gutterTemplate = '<div class="bs-colresizable-gutter"></div>';

		/**
		 * @param {HTMLElement|JQuery} $columnElement
		 */
		function getColumnSizes($columnElement) {
			var columnElement = angular.element($columnElement);

			/**
			 * @type {{xs: Number, sm: Number, md: Number, lg: Number}}
			 */
			var colSizes = {};

			var elemClass = columnElement.attr('class');
			var match = colRegex.exec(elemClass);

			var colSize = 12;
			angular.forEach(bsBreakpoints, (breakpoint) => {
				var regex = new RegExp('\\bcol-' + breakpoint.label + '-(\\d+)\\b', 'g');
				var matches = regex.exec(elemClass);
				if (matches) {
					colSize = Number.parseInt(matches[1]);
				}

				colSizes[breakpoint.label] = colSize;
			});

			return colSizes;
		}

		/**
		 * @param {HTMLElement|JQuery} $columnElement
		 * @param {{xs: Number, sm: Number, md: Number, lg: Number}} sizes
		 */
		function setColumnSizes($columnElement, sizes) {
			var columnElement = angular.element($columnElement);

			// Remove original size classes
			columnElement.attr('class', columnElement.attr('class').replace(colRegex, ''));

			// Add new classes
			angular.forEach(sizes, (colSize, breakpoint) => {
				columnElement.classList.add('col-' + breakpoint + '-' + colSize);
			});
		}

		/**
		 * Returns the current bootstrap breakpoint in action
		 * @return string
		 */
		function getBreakpoint() {
			var width = $window.innerWidth;

			var breakpoint = bsBreakpoints[0].label;
			for (var i = 1; i < bsBreakpoints.length; i++) {
				if (width > bsBreakpoints[i].min) {
					breakpoint = bsBreakpoints[i].label;
				}
			}

			return breakpoint;
		}

		return {
			restrict: 'A',
			scope: {
				'bsColresizable': '='
			},
			link: function(scope, rowElement, attrs) {
				function createGutter() {
					const gutter = angular.element(gutterTemplate);

					gutter.attr('draggable', 'false'); // prevent native drag

					var clone;
					var prevColumn;
					var offsetParent = rowElement;

					var columnChangeCallback = $parse(attrs.colResizeHandle);

					function moveClone(left) {
						clone.css({left: left + 'px'});
					}

					function endDrag(event) {
						$document.off('mouseup', endDrag);
						$document.off('mousemove', dragMove);
						clone.remove();
					}

					function dragMove(event) {
						event.preventDefault();

						const parentWidth = offsetParent.innerWidth();

						var left = event.pageX - offsetParent.offset().left;
						left = Math.max(0, Math.min(left, parentWidth));
						moveClone(left);

						var column = Math.round(left / (parentWidth / 12));

						if (column != prevColumn) {
							columnChangeCallback(scope, {
								$column: column,
								$event: event
							});
						}

						prevColumn = column;
					}

					function initDrag(event) {
						// Clone rowElement
						clone = gutter.clone();
						clone.insertAfter(gutter);
						clone.addClass('active');

						prevColumn = Math.round(rowElement.position().left / (offsetParent.width() / 12));

						$document.on('mouseup', endDrag);
						$document.on('mousemove', dragMove);
					}

					gutter.on('mousedown.colresize', initDrag);
				}

				/**
				 * @param {{xs: Number, sm: Number, md: Number, lg: Number}[]} model
				 */
				function layout(model) {
					angular.forEach(gutters, (gutter) => {
						angular.element(gutter).remove();
					});

					var colIndex = 0;
					rowElement.children().each((elem) => {
						var elemClass = elem.className;
						var nextClass = elem.nextElementSibling.className;

						if (colRegex.exec(elemClass) && !noSizeRegex.exec(elemClass)) {
							if (!model[colIndex]) {
								model[colIndex] = getDefaultColSize(elem);
							} else {
								setColumnSizes(elem, model[colIndex]);
							}

							// TODO: Create a gutter for each breakpoint. Set visibility (dynamically) depending on whether they are followed by a line break (the sum of column sizes from the start of the row is greater than 12)
							if (colRegex.exec(nextClass) && !noSizeRegex.exec(nextClass)) {
								var gutter = createGutter();
								gutter.afterIndex = colIndex;
								gutters.push(gutter);

								angular.element(elem).insertAfter(gutter);
							}
						}

						colIndex++;
					});
				}

				scope.$watch('colResizable', (value) => {
					layout(value);
				});
			}
		};
	});
