;(function(){

    /**
     * Проверка строки регулярным выражением
     * @param  [string] str - целевая строка
     * @param  [string] pattern - паттерн
     * @return [boolean] true/false
     */
    function regTest(str, pattern) {
        return pattern ? new RegExp(pattern).test(str) : true;
    }

    /**
     * Получить текущее время в мс
     * @return [number] время в мс
     */
    function getTime() {
        return new Date().getTime();
    }

    /**
     * Функция расчета факториала
     * @param  [number] n - заданное число
     * @return [number] результат
     */
    var getFactorial = (function(){
        var cache = [1,1];
        return function(n){
            if (!cache[n]) cache[n] = n * getFactorial(n -1);
            return cache[n];
        };
    })();

    /**
     * Функция расчета выборки
     * @param  [number] k - знаменатель
     * @param  [number] n - числитель
     * @return [number] результат выборки
     */
    function getSample(k, n) {
        return n >= k ? getFactorial(n) / (getFactorial(k) * getFactorial(n -k)) : 0;
    }

    /**
     * Контроллер валидации форм (конструктор)
     */
    var formsValidController = (function(){
        // функции валидации
        var cbs = {
            // форма параметров испытания
            form_params: function() {
                var isvalid = !this.find("tr.error.used").length;
                $("#but_submit").prop("disabled", !isvalid);
                return isvalid;
            }
        }
        // функция валидации по умолчанию
        function cb_default() {
            return !this.find("tr.error").length;
        }
        /**
         * Валидация формы
         * @param  [jquery] $form - целевая форма
         * @return [boolean] true/false
         */
        return function($form) {
            var id = $form.attr("id");
            return cbs[id] ? cbs[id].call($form) : cb_default.call($form);
        }
    })();

    /**
     * Сингтон испытания (констуктор)
     * @param [object] options - настройки
     */
    var _test = (function(options) {
        options = $.extend(true, {
            /**
             * Колбек перед началом испытания
             */
            cb_prepare: function() {
                // do nothing
            },
            /**
             * Колбек по завершению испытания
             * @param  [object] result - результат испытания
             */
            cb_result: function(result) {
                console.log(result);
            }
        }, options);

        /**
         * Функция подготовки точки вероятности
         * @param  [object] point - сырая точка
         * @return [object] готовая точка
         */
        function preparePoint(point) {
            // do something
            return point;
        }

        /**
         * Возможные испытания
         * @param  [array] params - массив используемых параметров
         * @param  [function] submit - функция массива точек вероятности
         */
        var test = {
            mm1: {
                params: ["poss","send","recv"],
                submit: function(args) {
                    var density = args.send/args.recv;
                    var points = [];
                    points.push(preparePoint({
                        k: 1,
                        pk: density/(1 + density)
                    }));
                    return {
                        points: points,
                        params: {
                            density: density,
                            maxcap: 1 // правка для одноканальной
                        }
                    }
                }
            },
            mmvk: {
                params: ["poss","maxcap","send","recv"],
                submit: function(args) {
                    var density = args.send/args.recv;
                    // проверка данных
                    var max_density = 150; //Math.log(Number.MAX_VALUE)/Math.log(args.maxcap);
                    if (density > max_density)
                        throw { message: "Приведенная плотность потока заявок не должна превышать значение " + max_density + "!" };
                    // расчет точек вероятности
                    var points = [];
                    for (var i = 1, cur, sum = 1, max = args.maxcap + 1; i != max; i++) {
                        cur = Math.pow(density, i)/getFactorial(i);
                        sum += cur;
                        points.push(preparePoint({
                            k: i,
                            pk: cur/sum
                        }));
                    }
                    return {
                        points: points,
                        params: {
                            density: density
                        }
                    }
                }
            },
            mmvkn: {
                params: ["poss","maxcap","amount","send","recv"],
                submit: function(args) {
                    var density = args.send/args.recv;
                    // расчет точек вероятности
                    if (args.maxcap > args.amount)
                        throw { message: "Количество обслуживающих узлов не должно превышать количество заявок!" };
                    var max_density = 150; //Math.log(Number.MAX_VALUE)/Math.log(args.maxcap);
                    if (density > max_density)
                        throw { message: "Приведенная плотность потока заявок не должна превышать значение " + max_density + "!" };
                    // расчет точек вероятности
                    var points = [];
                    for (var i = 1, cur, sum = 1/getFactorial(args.amount), max = args.maxcap + 1; i != max; i++) {
                        cur = Math.pow(density, i)/getFactorial(args.amount - i)/getFactorial(i);
                        sum += cur;
                        points.push(preparePoint({
                            k: i,
                            pk: cur/sum
                        }));
                    }
                    return {
                        points: points,
                        params: {
                            density: density
                        }
                    }
                }
            }
        };
        // Вернуть публичные методы синглтона
        return {
            fn: {
                /**
                 * Получить список параметров модели
                 * @param  [string] name - название модели
                 * @return [array] список параметров или пустой массив
                 */
                params: function(name) {
                    return test[name] ? test[name].params : [];
                },
                /**
                 * Запуск испытания
                 * @param  [string] name - название модели
                 * @param  [object] args - данные
                 */
                submit: function(name, args) {
                    try {
                        options.cb_prepare();
                        if (typeof test[name] === "undefined")
                            throw { message: "Выбрана неизвестная модель!" };
                        var result = { params: args };
                        var tbeg = getTime();
                        result = $.extend(true, result, test[name].submit(args));
                        var tend = getTime();
                        result.performance = tend - tbeg;
                        options.cb_result(result);
                    }
                    catch (e) {
                        alert("Ошибка: " + e.message);
                    }
                }
            }
        }
    })({
        // колбек перед началом
        cb_prepare: function() {
            $("#result_table").empty();
            $("#result_graph").empty();
            $("#wa_result").empty();
        },
        // колбек по окончании
        cb_result: function(result) {
            /**
             * Построение таблицы результата
             * @param  [object] result - результат
             * @param  [jquery] $table - целевая таблица
             * @param  [array] points - массив точек вероятности
             * @param  [number] needle - заданная граница (или null)
             * @node   дополняет result
             */
            ;(function(result, $table, points, needle) {
                var table_html = "";
                result.points.forEach(function(point){
                    table_html += "<tr><td>" + point.k + "</td><td>" + point.pk.toFixed(8) + "</td></tr>";
                });
                $table.append(table_html);
                if (needle !== null) {
                    // поиск подходящей точки вероятности и сохранение ее в результат
                    for (var i = 0, len = points.length; i != len && points[i].pk > needle; i++);
                    if (i != len) {
                        result.answer = {
                            amount: points[i].k,
                            pass: points[i].pk,
                            delta: needle - points[i].pk
                        };
                        $("#result_table tr").eq(i).addClass("answer");
                    }
                    else result.answer = null;
                }
            })(result, $("#result_table"), result.points, result.params.poss);

            /**
             * Построение графика результата
             * @param  [object] result - результат
             * @param  [jquery] $graph - целевой контейнер графика
             * @param  [array] points - массив точек вероятности
             * @param  [number] needle - заданная граница (или null)
             */
            ;(function(result, $graph, points, needle) {
                // формирование точек графика
                var data = [];
                if (points.length == 1) data.push([0.9999, points[0].pk]);
                points.forEach(function(point) {
                    data.push([point.k, point.pk]);
                });
                // создание объекта
                var g = new Dygraph(
                    $graph.get(0),
                    data,
                    {
                        axisLabelFontSize: 12,
                        includeZero: true,
                        labels: ["x", "вероятность потери"],
                        stackedGraph: true,
                        labelsDivWidth: needle !== null ? 380 : 280,
                        underlayCallback: function(canvas, area, g) {
                            // показать требуемую вероятность и ответ при необходимости
                            if (needle !== null) {
                                var poss_line = g.toDomCoords(0, needle)[1];
                                canvas.fillStyle = "rgba(178,34,34,1)";
                                canvas.fillRect(area.x, poss_line, area.w, 0.5);
                                if (result.answer) {
                                    var amount_line = g.toDomCoords(result.answer.amount, 0)[0];
                                    canvas.fillStyle = "rgba(210,105,30,0.8)";
                                    canvas.fillRect(amount_line, area.y, 2, area.h);
                                }
                            }
                        },
                        axes: {
                            x: {
                                axisLabelWidth: 30,
                                pixelsPerLabel: 30,
                                axisLabelFormatter: function(value) {
                                    return Math.round(value) - value !== 0 ? "" : value;
                                },
                                valueFormatter: function(value) {
                                    return Math.round(value);
                                }
                            },
                            y: {
                                axisLabelWidth: 45,
                                pixelsPerLabel: 15,
                                valueRange: [0, 1],
                                axisLabelFormatter: function(value) {
                                    return value.toFixed(4);
                                },
                                valueFormatter: function(value) {
                                    return value.toFixed(8)
                                      + (needle !== null ? " ["
                                        + ((needle >= value ? "<span class='green'>+" : "<span class='red'>") + (needle - value).toFixed(8)) + "</span>]" : "");
                                }
                            }
                        },
                        color: "#3F3F3F",
                        strokeWidth: 1.5
                    });
            })(result, $("#result_graph"), result.points, result.params.poss);

            /**
             * Формирование окончательного ответа
             * @param  [object] result - результат
             * @param  [jquery] $result - целевой контейнер результатов
             */
            ;(function(result, $result) {
                // если была задана требуемая надежность
                if (result.params.poss !== null) {
                    $result.append("<p>Необходимо обслуживающих узлов: "
                        + (result.answer
                            ? "<span class='value'>" + result.answer.amount + "</span></p>"
                            : "<span class='value red'>невозможно</span></p><br>"));
                    if (result.answer) {
                        $result.append("<p>Вероятность потери заявки: <span class='value'>~"
                            + result.answer.pass.toFixed(8) + "</span> [<span class='value green'>+"
                            + result.answer.delta.toFixed(8) + "</span>]</p><br>");
                    }
                }
                // прочие результаты
                $result.append("<p>Расчеты при количестве обслуживающих узлов: "
                    + (result.points.length > 1 ? "от 1 до <span class='value'>" + result.points.length + "</span>" : "<span class='value'>1</span>")
                    + "</p>");
                $result.append("<p>Затраченное на расчеты время: <span class='value'>~" + result.performance + "</span> мс</p><br>");
                // формирование итогового сообщения
                alert("Расчет эффективности системы завершен." + (result.params.poss !== null
                    ? (result.answer
                        ? "\n\nДля обеспечения требуемой надежности системы необходимо как минимум " + result.answer.amount + " обслуживающих узлов."
                        : "\n\nВ данной конфигурации системы невозможно обеспечить требуемую надежность!")
                    : ""));
            })(result, $("#wa_result"));

            // для дебага
            console.log(result);
        }
    });

    // После полной загрузки приложения ========================================
    $(window).load(function(){

        // Выбор модели из списка возможных
        $("#model_list").delegate("li:not(.selected):not(.disabled)", "click", function(event) {
            var name = $(this).attr("name"),
                params = _test.fn.params(name);
            $("#model_list li").removeClass("selected");
            $(this).addClass("selected");
            // получить список параметров модели
            $("#form_params tr").each(function(){
                var $this = $(this),
                    isused = !!(params.indexOf($this.attr("name")) +1);
                $this.toggleClass("used", isused);
                if (isused) $this.find(".tf_value").change();
            });
        });

        // Валидация поля и формы при редактировании значения
        $(".table_form").delegate(".tf_value", "keyup change", function(event) {
            var $this = $(this),
                $item = $this.closest("tr"),
                $error = $item.find(".tf_error"),
                name = $item.attr("name"),
                value = $this.val(),
                pattern = $this.attr("data-pattern"),
                msgempty = $this.attr("data-msgempty"),
                msgerror = $this.attr("data-msgerror");

            $error.text("");
            var isvalid = true;
            try {
                if (!value.length && typeof msgempty !== "undefined") throw { message: msgempty };
                else if (value.length && !regTest(value, pattern)) throw { message: msgerror };
            }
            catch (e) {
                $error.text(e.message);
                isvalid = false;
            }
            $item.toggleClass("error", !isvalid);
            formsValidController($item.closest(".table_form"));
        });

        // Старт испытания по нажатию кнопки
        $("#but_submit").click(function(event) {
            var args = {};
            $("#form_params tr.used").each(function() {
                var $this = $(this),
                    $input = $this.find(".tf_value"),
                    name = $this.attr("name"),
                    value = $input.val(),
                    type = $input.attr("data-type");
                args[name] = value.length ? (type == "number" ? value -0 : value) : null;
            });
            _test.fn.submit($("#model_list li.selected").attr("name"), args);
        });

        $(window).keyup(function(event) {
            switch (event.keyCode) {
                case 13: $("#but_submit:not(:focus):enabled").focus().click(); break;
                default: break;
            }
        });

        // выбор первой модели из списка по умолчанию
        $("#model_list li:first").click();
    });

})();
