;(function(){

    function regTest(str, pattern) {
        return pattern ? new RegExp(pattern).test(str) : true;
    }

    function getTime() {
        return new Date().getTime();
    }

    var getFactorial = (function(){
        var cache = [1,1];
        return function(n){
            if (!cache[n]) cache[n] = n * getFactorial(n -1);
            return cache[n];
        };
    })();

    function getSample(k, n) {
        return n >= k ? getFactorial(n) / (getFactorial(k) * getFactorial(n -k)) : 0;
    }

    var formsValidController = (function(){
        var cbs = {
            form_params: function() {
                var isvalid = !this.find("tr.error.used").length;
                $("#but_submit").prop("disabled", !isvalid);
                return isvalid;
            }
        }
        function cb_default() {
            return !this.find("tr.error").length;
        }
        return function($form) {
            var id = $form.attr("id");
            return cbs[id] ? cbs[id].call($form) : cb_default.call($form);
        }
    })();

    var _test = (function(options) {
        options = $.extend(true, {
            cb_prepare: function() {
                // do nothing
            },
            cb_result: function(result) {
                console.log(result);
            }
        }, options);

        function preparePoint(point) {
            // do something
            return point;
        }

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
                            maxcap: 1
                        }
                    }
                }
            },
            mmvk: {
                params: ["poss","maxcap","send","recv"],
                submit: function(args) {
                    var density = args.send/args.recv;
                    var max_density = Math.log(Number.MAX_VALUE)/Math.log(args.maxcap);
                    if (density > max_density)
                        throw { message: "Превышено допустимое для данной конфигурации отношение плотности заявок к показательному времени обслуживания: "
                            + density + " при допустомом значении ~" + (max_density.toFixed(2))
                            + ". Это связано с переполнением используемого при расчетах типе данных и в скором времени будет исправлено." };
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
                    return {
                        params: {
                        }
                    }
                }
            }
        };
        return {
            fn: {
                params: function(name) {
                    return test[name] ? test[name].params : [];
                },
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
        cb_prepare: function() {
            $("#result_table").empty();
            $("#wa_result").empty();
        },
        cb_result: function(result) {
            // to Table
            ;(function(result, $table, points, needle) {
                var table_html = "";
                result.points.forEach(function(point){
                    table_html += "<tr><td>" + point.k + "</td><td>" + point.pk.toFixed(8) + "</td></tr>";
                });
                $table.append(table_html);
                if (needle !== null) {
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
            // to Graph

            // to Result
            ;(function(result, $result) {
                if (result.params.poss) {
                    $result.append("<p>Необходимо обслуживающих узлов: "
                        + (result.answer
                            ? "<span class='value'>" + result.answer.amount + "</span></p>"
                            : "<span class='value red'>невозможно</span></p><br>"));
                    if (result.answer) {
                        $result.append("<p>Вероятность потери заявки: <span class='value'>~"
                            + result.answer.pass.toFixed(4) + "</span> [<span class='value green'>+"
                            + result.answer.delta.toFixed(4) + "</span>]</p><br>");
                    }
                }
                $result.append("<p>Расчеты при количестве обслуживающих узлов: "
                    + (result.points.length > 1 ? "от 1 до <span class='value'>" + result.points.length + "</span>" : "<span class='value'>1</span>")
                    + "</p>");
                $result.append("<p>Затраченное на расчеты время: <span class='value'>~" + result.performance + "</span> мс</p><br>");
                alert("Расчет эффективности системы завершен." + (result.params.poss !== null
                    ? (result.answer
                        ? "\n\nДля обеспечения требуемой надежности системы необходимо как минимум " + result.answer.amount + " обслуживающих узлов."
                        : "\n\nВ данной конфигурации системы невозможно обеспечить требуемую надежность!")
                    : ""));
            })(result, $("#wa_result"));

            console.log(result);
        }
    });

    $(window).load(function(){

        $("#model_list").delegate("li:not(.selected):not(.disabled)", "click", function(event) {
            var name = $(this).attr("name"),
                params = _test.fn.params(name);
            $("#model_list li").removeClass("selected");
            $(this).addClass("selected");
            $("#form_params tr").each(function(){
                var $this = $(this),
                    isused = !!(params.indexOf($this.attr("name")) +1);
                $this.toggleClass("used", isused);
                if (isused) $this.find(".tf_value").change();
            });
        });

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

        $("#model_list li:first").click();

    });

})();
