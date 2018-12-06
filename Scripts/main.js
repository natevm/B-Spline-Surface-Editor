import { BSplineEditor } from "./BSplineEditor.js"
import { KnotEditor } from "./KnotEditor.js"
import { BSpline } from "./BSpline.js"

let bsplineEditor;
let knotEditor;
let knotEditorOpen = false;

/* Main AngularJS controller */
angular
    .module('BSplineEditor', ['ngMaterial', 'ngMessages', 'ngSanitize'])
    .config(function ($mdIconProvider, $mdThemingProvider) {
        $mdIconProvider
            .defaultIconSet('img/icons/sets/core-icons.svg', 24);

        $mdThemingProvider.definePalette('black', {
            '50': '323639', // Background color of bottom sheet
            '100': '111111',
            '200': '202124', // select
            '300': '323639', // primary/warn
            '400': '444444',
            '500': '555555', // primary/warn 
            '600': 'FFFFFF', // background accent
            '700': '777777',
            '800': '888888', // primary/warn
            '900': 'FFFFFF',
            'A100': '202124', // primary/warn   accent    background
            'A200': 'FFFFFF', // accent (text)
            'A400': 'CCCCCC', // accent
            'A700': 'DDDDDD', // accent
            'contrastDefaultColor': 'light'
        });

        $mdThemingProvider.theme('default')
            .primaryPalette('black', { 'default': '600' })
            .accentPalette('black', { 'default': '600' })
            .warnPalette('black')
            .backgroundPalette('black')

        $mdThemingProvider.alwaysWatchTheme(true);
    })
    .filter('keyboardShortcut', function ($window) {
        return function (str) {
            if (!str) return;
            var keys = str.split('-');
            var isOSX = /Mac OS X/.test($window.navigator.userAgent);

            var separator = (!isOSX || keys.length > 2) ? '+' : '';

            var abbreviations = {
                M: isOSX ? '' : 'Ctrl',
                A: isOSX ? 'Option' : 'Alt',
                S: 'Shift'
            };

            return keys.map(function (key, index) {
                var last = index === keys.length - 1;
                return last ? key : abbreviations[key];
            }).join(separator);
        };
    })
    .controller('BSplineCtrl', function BSplineCtrl($mdDialog, $mdBottomSheet, $mdToast, $scope, $timeout, $window) {
        $scope.settings = {
            printLayout: true,
            
            showControlPolygon: true,
            showControlHandles: true,
            showBSpline: true,
            showSurface: true,
            showMesh: true,
            showKnotValues: true,
            showNodeValues: true,

            minzoom: 1,
            maxzoom: 1000,
            zoom: 400,
            snappingEnabled: true,
            fullScreen: false,
            useOrtho: false,
            insertionMode: 'back',
            editingU: true,
            editingV: false,
            designName: (localStorage.getItem("design_name") == undefined) ? "Untitled design" : localStorage.getItem("design_name")
        };

        $timeout(function () {
            const render = function (time) {
                bsplineEditor.render(time);
                knotEditor.render(time);
                requestAnimationFrame(render);
            };
            
            window.onresize = function () {
                bsplineEditor.resize()
                knotEditor.resize()
            };
            
            function cleanArray(actual) {
                var newArray = new Array();
                for (var i = 0; i < actual.length; i++) {
                    var temp = actual[i].trim()
                    if (temp.indexOf('#') != -1) {
                        temp = temp.substring(0, temp.indexOf('#'));
                    }
                    if (temp && temp.length >= 1) {
                        newArray.push(temp);
                    }
                }
                return newArray;
            }
            
            function assert(condition, message) {
                if (!condition) {
                    message = message || "Assertion failed";
                    if (typeof Error !== "undefined") {
                        throw new Error(message);
                    }
                    throw message; // Fallback
                }
            }

            // var UploadBSplineFileButton = document.getElementById("UploadBSplineFile");
            // UploadBSplineFileButton.addEventListener("change", (e) => {
            //     var selectedFile = event.target.files[0];
            //     var filename = event.target.files[0].name;
            //     var reader = new FileReader();
            //     reader.onload = (event) => {
            //         var lines = event.target.result.split("\n");
            //         lines = cleanArray(lines)
            //         var numBSplines = parseInt(lines[0], 10);
            //         assert(numBSplines >= 0, "Number of splines must be greater than or equal to zero! (P >= 0)")
            //         lines = lines.splice(1)
        
            //         var splines = [];
            //         for (var i = 0; i < numBSplines; ++i) {
            //             splines[i] = new BSpline();
            //             var numPoints = -1;
            //             var degree = -1;
        
            //             /* Get the degree */
            //             lines[0] = lines[0].trim()
            //             degree = parseInt(lines[0]);
            //             lines = lines.splice(1)
        
            //             /* Get total points in first line */
            //             lines[0] = lines[0].trim()
            //             numPoints = parseInt(lines[0])
            //             lines = lines.splice(1)
        
            //             console.log("new curve")
        
            //             /* Parse control points */
            //             splines[i].controlPoints = [[]]
            //             for (var j = 0; j < numPoints; ++j) {
            //                 var separators = [' ', '\t'];
            //                 var strArray = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
            //                 strArray = cleanArray(strArray)
            //                 assert(strArray.length == 3);
            //                 var x = parseFloat(strArray[0])
            //                 var y = parseFloat(strArray[1])
            //                 var z = parseFloat(strArray[2])
            //                 console.log("x: " + x + " y: " + y + " z: " + z);
            //                 lines = lines.splice(1)
            //                 if (numPoints < 100 || j % 2 == 0) {
            //                     splines[i].controlPoints[0].push(x, y, z)
            //                 }
            //             }
        
            //             splines[i].setDegree(degree);
        
            //             /* Parse knot */
            //             var knotProvided = 0;
            //             if (lines.length != 0) 
            //             {
            //                 lines[0] = lines[0].trim()
            //                 knotProvided = parseInt(lines[0])
            //                 lines = lines.splice(1)
            //             }
        
            //             if (knotProvided == 0) {
            //                 splines[i].setOpen(true);
            //                 splines[i].setUniformity(true);
            //             } else {
            //                 splines[i].setOpen(false);
            //                 splines[i].setUniformity(false);
            //                 var separators = [' ', '\t'];
            //                 var strArray = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
            //                 strArray = cleanArray(strArray)
            //                 var knot = [];
            //                 for (var j = 0; j < strArray.length; ++j) {
            //                     knot.push(parseFloat(strArray[j]));
            //                 }
            //                 /* normalize the knot */
            //                 var min = knot[0];
            //                 var max = knot[knot.length - 1];
            //                 for (var j = 0; j < knot.length; ++j) {
            //                     knot[j] -= min;
            //                     knot[j] /= (max - min);
            //                 }
            //                 splines[i].knot_vector = knot;
            //                 lines = lines.splice(1)
            //             }
        
        
            //             if (filename.endsWith(".crv")) {
            //                 splines[i].showBSpline = false;
            //                 splines[i].showControlPolygon = true;
            //                 splines[i].showControlPoints = false;
            //             }
            //             bsplineEditor.splines.push(splines[i])
            //         }
            //         console.log(lines);
            //         bsplineEditor.backup();
            //         bsplineEditor.selectedBSpline = 0; // TEMPORARY

            //     }
            //     reader.readAsText(selectedFile);
            //     document.getElementById("UploadBSplineFile").value = ""
            // });

            var UploadBSplineSurfaceFileButton = document.getElementById("UploadBSplineSurfaceFile");
            UploadBSplineSurfaceFileButton.addEventListener("change", (e) => {
                var selectedFile = event.target.files[0];
                var filename = event.target.files[0].name;
                var reader = new FileReader();
                reader.onload = (event) => {
                    var lines = event.target.result.split("\n");
                    lines = cleanArray(lines)
                    var numBSplineSurfaces = parseInt(lines[0], 10);
                    assert(numBSplineSurfaces >= 0, "Number of surfaces must be greater than or equal to zero! (P >= 0)")
                    lines = lines.splice(1)
        
                    let splines = [];
                    var separators = [' ', '\t'];
                    for (var i = 0; i < numBSplineSurfaces; ++i) {
                        var numPoints = -1;
                        var u_degree = -1;
                        var v_degree = -1;
                        var num_u_knots = -1;
                        var num_v_knots = -1;
                        var u_knot_vector = [];
                        var v_knot_vector = [];
                        var num_u_control_points;
                        var num_v_control_points;
                        var control_points = [];
        
                        /* Get the degrees */
                        lines[0] = lines[0].trim()
                        var degreeArray = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                        degreeArray = cleanArray(degreeArray)
                        u_degree = parseInt(degreeArray[0]);
                        v_degree = parseInt(degreeArray[1]);
                        lines = lines.splice(1)

                        /* Get knot lengths */
                        lines[0] = lines[0].trim()
                        var knot_lengths = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                        knot_lengths = cleanArray(knot_lengths)
                        num_u_knots = parseInt(knot_lengths[0]);
                        num_v_knots = parseInt(knot_lengths[1]);
                        lines = lines.splice(1)
        
                        /* Get U Knot Vector */
                        lines[0] = lines[0].trim()
                        var str_knot_vector = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                        str_knot_vector = cleanArray(str_knot_vector)
                        for (var j = 0; j < str_knot_vector.length; ++j) {
                            u_knot_vector.push(parseFloat(str_knot_vector[j]));
                        }
                        lines = lines.splice(1)

                        /* Get V Knot Vector */
                        lines[0] = lines[0].trim()
                        str_knot_vector = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                        str_knot_vector = cleanArray(str_knot_vector)
                        for (var j = 0; j < str_knot_vector.length; ++j) {
                            v_knot_vector.push(parseFloat(str_knot_vector[j]));
                        }
                        lines = lines.splice(1)

                        num_u_control_points = num_u_knots - (u_degree + 1);
                        num_v_control_points = num_v_knots - (v_degree + 1);

                        for (var u = 0; u < num_u_control_points; ++u) {
                            control_points.push([]);
                            for (var v = 0; v < num_v_control_points; ++v) {
                                /* Get a control point */
                                lines[0] = lines[0].trim()
                                var str_ctl_pt = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                                str_ctl_pt = cleanArray(str_ctl_pt)
                                control_points[u].push(parseFloat(str_ctl_pt[0]));
                                control_points[u].push(parseFloat(str_ctl_pt[1]));
                                control_points[u].push(parseFloat(str_ctl_pt[2]));
                                lines = lines.splice(1)
                            }
                        }

                        /* Add spline to editor */
                        var data = {
                            control_points: control_points,
                            u_knot_vector: u_knot_vector,
                            v_knot_vector: v_knot_vector,
                            is_u_open: false,
                            is_v_open: false,
                            is_u_uniform: false,
                            is_v_uniform: false,
                            u_degree: u_degree,
                            v_degree: v_degree
                        }
                        splines.push(new BSpline(data));
                        
                        splines[i].show_control_points = bsplineEditor.showControlHandles;
                        splines[i].show_control_polygon = bsplineEditor.showControlPolygons;
                        splines[i].show_mesh = bsplineEditor.showMesh;
                        splines[i].show_bspline = bsplineEditor.showBSplines;
                        splines[i].show_surface = bsplineEditor.showSurface;
                        splines[i].show_knot_values = bsplineEditor.showKnotValues;
                        splines[i].show_node_values = bsplineEditor.showNodes;
                        splines[i].curve_moved = true;
                        bsplineEditor.splines.push(splines[i])

                    }
                    console.log(lines);
                    bsplineEditor.backup();
                    bsplineEditor.splines[0].select();
                    bsplineEditor.selectedBSpline = 0; // TEMPORARY

                }
                reader.readAsText(selectedFile);
                document.getElementById("UploadBSplineSurfaceFile").value = ""
            });

            
            var UploadBSplineCurveFamilyFile = document.getElementById("UploadBSplineCurveFamilyFile");
            UploadBSplineCurveFamilyFile.addEventListener("change", (e) => {
                var selectedFile = event.target.files[0];
                var filename = event.target.files[0].name;
                var reader = new FileReader();
                reader.onload = (event) => {
                    var separators = [' ', '\t'];

                    var lines = event.target.result.split("\n");
                    lines = cleanArray(lines)

                    // Read number of curves, u_degree of curves, and number of control points per curve
                    lines[0] = lines[0].trim()
                    var size_data = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                    size_data = cleanArray(size_data)

                    var num_v_ctl_pts = parseInt(size_data[0], 10);
                    var u_degree = parseInt(size_data[1], 10);
                    var num_u_ctl_pts = parseInt(size_data[2], 10);

                    assert(num_v_ctl_pts >= 0, "Number of curves must be greater than or equal to zero! (P >= 0)")
                    lines = lines.splice(1)
        
                    var num_u_knots = u_degree + 1 + num_u_ctl_pts;
                    var u_knot_vector = [];

                    // Read the u knot vector
                    lines[0] = lines[0].trim()
                    var str_knot_vector = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                    str_knot_vector = cleanArray(str_knot_vector)
                    for (var i = 0; i < str_knot_vector.length; ++i) {
                        u_knot_vector.push(parseFloat(str_knot_vector[i]));
                    }
                    lines = lines.splice(1)

                    var V = [];

                    /* Now read the control points for each curve */
                    for (var v = 0; v < num_v_ctl_pts; ++v) {
                        V.push([]);
                        for (var u = 0; u < num_u_ctl_pts; ++u) {
                            let p = [];
                            /* Get a control point */
                            lines[0] = lines[0].trim()
                            var str_ctl_pt = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                            str_ctl_pt = cleanArray(str_ctl_pt)
                            p.push(parseFloat(str_ctl_pt[0]));
                            p.push(parseFloat(str_ctl_pt[1]));
                            p.push(parseFloat(str_ctl_pt[2]));
                            V[v].push(p);
                            lines = lines.splice(1)
                        }
                    }

                    
                    /* Make a knot vector along U following Schoenberg Whitney Theorem */
                    let v_knot_vector = [];
                    let v_degree = 1;
                    let v_order = 2;

                    // if (num_v_ctl_pts < (v_order + 1) ) {
                    //     v_degree = 1;
                    //     v_order = 2;
                    // }

                    /* Push an order of control points at the front */
                    for (var i = 0; i < v_order; ++i) {
                        v_knot_vector.push(0);
                    }

                    /* Push internal knots */
                    let m = (V[0].length + 1); // m - 1
                    for (var i = 1; i < m; ++i) {
                        v_knot_vector.push( i / m );
                    }

                    /* Push an order of control points at the back */
                    for (var i = 0; i < v_order; ++i) {
                        v_knot_vector.push(1);
                    }



                    // for (var i = 0; i < numBSplineCurves + v_order; ++i) {
                    //     v_knot_vector.push((i / (numBSplineCurves + v_degree)) * 1.1 );
                    // }

                    /* Now we need to compute V nodal values. */
                    // let vNodes = [];
                    // for (var i = 0; i < v_knot_vector.length - v_order; ++i) {
                    //     let node = 0;
                    //     for (var n = 1; n <= v_degree; ++n) {
                    //         node += v_knot_vector[i + n];
                    //     }
                    //     node /= v_degree;
                    //     vNodes.push(node);
                    // }

                    // let evaluate_basis = function(t, i, k, knot_vector) {
                    //     if (k <= 1) {
                    //         let t_i = knot_vector[i];
                    //         let t_i_1 = knot_vector[i + 1];
                    //         if ((t >= t_i) && (t < t_i_1)) return 1;
                    //         else return 0;
                    //     }

                    //     let alpha1 = (t - knot_vector[i]) / ( knot_vector[i + k] - knot_vector[i] );
                    //     let alpha2 = (knot_vector[i + k + 1] - t) / (knot_vector[i + k + 1] - knot_vector[i + 1]);

                    //     return alpha1 * evaluate_basis(t, i, k - 1, knot_vector) + alpha2 * evaluate_basis(t, i + 1, k - 1, knot_vector);
                    // }

                    // let N = [];
                    // for (var n_i = 0; n_i < num_v_ctl_pts; ++n_i) {
                    //     N.push([]);
                        
                    //     for (var b = 0; b < num_v_ctl_pts; ++b) {
                    //         let node = vNodes[b];
                    //         let basisValue = evaluate_basis(node, n_i, v_degree, v_knot_vector);
                    //         N[n_i].push( basisValue );
                    //     }
                    // }
                    

                    // // In surface nodal interpolation, a matrix of control points C can be solved in a two step process given a matrix D 
                    // // of data points using B transpose * C * N = D.

                    // // This situation is slightly different, since we're given a set of curves.
                    // console.log(V.length)
                    // console.log(V[0].length)

                    // Now, need to solve for C in C = V (N inverse)
                    // First, need to compute N



                    // var splines = [];
                    // 
                    // for (var i = 0; i < numBSplineSurfaces; ++i) {
                    //     var numPoints = -1;
                    //     var u_degree = -1;
                    //     var v_degree = -1;
                    //     
                    //     var num_v_knots = -1;
                    //     
                    //     var v_knot_vector = [];
                    //     var num_u_control_points;
                    //     var num_v_control_points;
                    //     
        
                    //     /* Get the degrees */
                    //     lines[0] = lines[0].trim()
                    //     var degreeArray = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                    //     degreeArray = cleanArray(degreeArray)
                    //     u_degree = parseInt(degreeArray[0]);
                    //     v_degree = parseInt(degreeArray[1]);
                    //     lines = lines.splice(1)

                    //     /* Get knot lengths */
                    //     lines[0] = lines[0].trim()
                    //     var knot_lengths = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                    //     knot_lengths = cleanArray(knot_lengths)
                    //     num_u_knots = parseInt(knot_lengths[0]);
                    //     num_v_knots = parseInt(knot_lengths[1]);
                    //     lines = lines.splice(1)
        
                    //     /* Get U Knot Vector */
                    //     lines[0] = lines[0].trim()
                    //     var str_knot_vector = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                    //     str_knot_vector = cleanArray(str_knot_vector)
                    //     for (var i = 0; i < str_knot_vector.length; ++i) {
                    //         u_knot_vector.push(parseFloat(str_knot_vector[i]));
                    //     }
                    //     lines = lines.splice(1)

                    //     /* Get V Knot Vector */
                    //     lines[0] = lines[0].trim()
                    //     str_knot_vector = lines[0].split(new RegExp('[' + separators.join('') + ']', 'g'));
                    //     str_knot_vector = cleanArray(str_knot_vector)
                    //     for (var i = 0; i < str_knot_vector.length; ++i) {
                    //         v_knot_vector.push(parseFloat(str_knot_vector[i]));
                    //     }
                    //     lines = lines.splice(1)

                    //     num_u_control_points = num_u_knots - (u_degree + 1);
                    //     num_v_control_points = num_v_knots - (v_degree + 1);

                        let control_points = [];
                        for (var u = 0; u < num_u_ctl_pts; ++u) {
                            control_points.push([]);
                            for (var v = 0; v < num_v_ctl_pts; ++v) {
                                /* Get a control point */
                                control_points[u].push(V[v][u][0])
                                control_points[u].push(V[v][u][1])
                                control_points[u].push(V[v][u][2])
                            }
                        }

                        /* Add spline to editor */
                        var data = {
                            control_points: control_points,
                            u_knot_vector: u_knot_vector,
                            v_knot_vector: v_knot_vector,
                            is_u_open: false,
                            is_v_open: false,
                            is_u_uniform: false,
                            is_v_uniform: false,
                            u_degree: u_degree,
                            v_degree: v_degree
                        }
                        let spline = new BSpline(data);
                        
                        spline.show_control_points = bsplineEditor.showControlHandles;
                        spline.show_control_polygon = bsplineEditor.showControlPolygons;
                        spline.show_mesh = bsplineEditor.showMesh;
                        spline.show_bspline = bsplineEditor.showBSplines;
                        spline.show_surface = bsplineEditor.showSurface;
                        spline.show_knot_values = bsplineEditor.showKnotValues;
                        spline.show_node_values = bsplineEditor.showNodes;

                        spline.curve_moved = true;

                        bsplineEditor.splines.push(spline)
                    // }
                    // console.log(lines);
                    // bsplineEditor.backup();
                    // bsplineEditor.splines[0].select();
                    // bsplineEditor.selectedBSpline = 0; // TEMPORARY

                }
                reader.readAsText(selectedFile);
                document.getElementById("UploadBSplineCurveFamilyFile").value = ""
            });

            bsplineEditor = new BSplineEditor();
            knotEditor = new KnotEditor();
            requestAnimationFrame(render);
        });



        $scope.sampleAction = function (name, ev) {
            $mdDialog.show($mdDialog.alert()
                .title(name)
                .textContent('You triggered the "' + name + '" action')
                .ok('Great')
                .targetEvent(ev)
            );
        };

        // $scope.updateEditUVMode = function(ev) {
        //     bsplineEditor.editingU = $scope.settings.editingU;
        //     // $mdToast.show(
        //     //     $mdToast.simple()
        //     //         .textContent('Editing ' + ($scope.settings.snappingEnabled) ? "enabled" : "disabled"+ '.')
        //     //         .position('bottom right')
        //     //         .hideDelay(3000)
        //     // );
        // }

        $scope.updateSnapping = function (ev) {
            bsplineEditor.setSnappingMode($scope.settings.snappingEnabled);
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Snapping ' + ($scope.settings.snappingEnabled) ? "enabled" : "disabled"+ '.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        }

        $scope.updateVisibility = function (ev) {
            bsplineEditor.setControlPolygonVisibility($scope.settings.showControlPolygon);
            bsplineEditor.setControlHandleVisibility($scope.settings.showControlHandles);
            bsplineEditor.setBSplineVisibility($scope.settings.showBSpline);

            bsplineEditor.setSurfaceVisibility($scope.settings.showSurface);
            bsplineEditor.setMeshVisibility($scope.settings.showMesh);
            bsplineEditor.setKnotValueVisibility($scope.settings.showKnotValues);
            bsplineEditor.setNodeVisibility($scope.settings.showNodeValues);

            $mdToast.show(
                $mdToast.simple()
                    .textContent('Visibility updated.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        };

        $scope.addBSpline = function (ev) {
            console.log(ev);
            bsplineEditor.newBSpline()
            $mdToast.show(
                $mdToast.simple()
                    .textContent('BSpline added.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        };

        $scope.deleteBSpline = function (ev) {
            if (bsplineEditor.getSelectedBSpline() == -1) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Error: no curve selected.')
                        .position('bottom right')
                        .hideDelay(3000)
                );
                return;
            }

            bsplineEditor.deleteLastBSpline();
        };

        $scope.deleteLastHandle = function (ev) {
            if (bsplineEditor.getSelectedBSpline() == -1) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Error: no handle selected.')
                        .position('bottom right')
                        .hideDelay(3000)
                );
                return;
            }

            bsplineEditor.deleteLastHandle();
        }

        $scope.updateInsertionMode = function (ev) {
            console.log($scope.settings.insertionMode)
            if ($scope.settings.insertionMode == "front") {
                bsplineEditor.setAddMode(true, false, false);
            }
            if ($scope.settings.insertionMode == "back") {
                bsplineEditor.setAddMode(false, true, false);
            }
            if ($scope.settings.insertionMode == "closest") {
                bsplineEditor.setAddMode(false, false, true);
            }

            $mdToast.show(
                $mdToast.simple()
                    .textContent('Insertion mode updated.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        }

        $scope.toggleFullScreen = function (ev, toggle=false) {
            if (toggle) {
                $scope.settings.fullScreen = !$scope.settings.fullScreen;
            }
            if ($scope.settings.fullScreen) {
                var docElm = document.getElementById("editor");
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                } else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                } else if (docElm.webkitRequestFullScreen) {
                    docElm.webkitRequestFullScreen();
                } else if (docElm.msRequestFullscreen) {
                    docElm.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        };

        $scope.goTo2DEditor = function(ev) {
            $window.location.href = "./index.html"
        }

        $scope.resetCamera = function (ev) {
            $scope.settings.zoom = 400;
            bsplineEditor.resetCamera();
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Camera reset.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        }

        $scope.lookAtXY = function (ev) {
            bsplineEditor.lookAtXY();
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Camera set to XY.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        }

        $scope.lookAtXZ = function (ev) {
            bsplineEditor.lookAtXZ();
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Camera set to XZ.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        }

        $scope.lookAtYZ = function (ev) {
            bsplineEditor.lookAtYZ();
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Camera set to YZ.')
                    .position('bottom right')
                    .hideDelay(3000)
            );
        }

        

        $scope.toggleOrtho = function (ev) {
            bsplineEditor.setOrthoEnabled($scope.settings.useOrtho);
        }

        $scope.updateZoom = function () {
            var amount = (1000.0 - $scope.settings.zoom) / 1000.0;
            amount *= 3 * 2.0;
            amount -= 1 * 2.0;
            // amount += .5;
            // amount *= .1;

            
            bsplineEditor.updateZoom(amount);
        }

        $scope.save = function (ev) {
            // Function to download data to a file
            function download(data, filename, type) {
                var file = new Blob([data], { type: type });
                if (window.navigator.msSaveOrOpenBlob) // IE10+
                    window.navigator.msSaveOrOpenBlob(file, filename);
                else { // Others
                    var a = document.createElement("a"),
                        url = URL.createObjectURL(file);
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function () {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 0);
                }
            }

            var text = "# Number of surfaces: \n"
            text += bsplineEditor.splines.length + "\n"

            for (var i = 0; i < bsplineEditor.splines.length; ++i) {
                text += "\n# Surface " + i + "\n\n";
                text += "# Degrees: \n";
                text += bsplineEditor.splines[i].u_degree + " " + bsplineEditor.splines[i].v_degree + "\n";
                text += "# Lengths of Knot Vectors in U and V: \n";
                text += bsplineEditor.splines[i].u_knot_vector.length + " " + bsplineEditor.splines[i].v_knot_vector.length + "\n";
                
                
                text += "# Knot vector in U: \n"
                
                for (var j = 0; j < bsplineEditor.splines[i].u_knot_vector.length; ++j) {
                    text += bsplineEditor.splines[i].u_knot_vector[j] + " ";
                }
                text += "\n"
                text += "# Knot vector in U: \n"
                for (var j = 0; j < bsplineEditor.splines[i].v_knot_vector.length; ++j) {
                    text += bsplineEditor.splines[i].v_knot_vector[j] + " ";
                }
                text += "\n"
                text += "# Control point data: \n";
                for (var u = 0; u < bsplineEditor.splines[i].getNumUControlPoints(); u++) {
                    for (var v = 0; v < bsplineEditor.splines[i].getNumVControlPoints(); v++) {
                        let pos = bsplineEditor.splines[i].getHandlePosFromUV(u, v);

                        text += pos[0] + "    ";
                        text += pos[1] + "    "
                        text += pos[2] + "\n"
                    }
                }
            }
            download(text, $scope.settings.designName + ".dat", "text");
        };

        $scope.renameDesign = function (ev) {
            bsplineEditor.setShortcutsEnabled(false);

            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.prompt()
                .title('What would you like to rename your design?')
                // .textContent('Bowser is a common name.')
                .placeholder('Design name')
                .ariaLabel('Design name')
                .initialValue('Untitled design')
                .targetEvent(ev)
                .required(true)
                .ok('Rename')
                .cancel('Cancel');

            $mdDialog.show(confirm).then((result) => {
                $scope.settings.designName = result;
                localStorage.setItem("design_name", $scope.settings.designName);
                bsplineEditor.setShortcutsEnabled(true);

                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Project renamed to "' + $scope.settings.designName + '".')
                        .position('bottom right')
                        .hideDelay(3000)
                );
            }, () => {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Rename canceled.')
                        .position('bottom right')
                        .hideDelay(3000)
                );
                bsplineEditor.setShortcutsEnabled(true);
            });
        };

        $scope.newDesign = function (ev) {
            bsplineEditor.setShortcutsEnabled(false);

            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.prompt()
                .title('What would you like to call your design?')
                .textContent('WARNING: This will delete any unsaved progress')
                .placeholder('Design name')
                .ariaLabel('Design name')
                .initialValue('Untitled design')
                .targetEvent(ev)
                .required(true)
                .ok('Create')
                .cancel('Cancel');

            $mdDialog.show(confirm).then((result) => {
                $scope.settings.designName = result;
                bsplineEditor.deleteAll();
                localStorage.setItem("design_name", $scope.settings.designName);
                bsplineEditor.setShortcutsEnabled(true);
            }, () => {
                console.log('New design canceled');
                bsplineEditor.setShortcutsEnabled(true);
            });
        };

        $scope.showHelp = function (ev) {
            $mdDialog.show($mdDialog.alert()
                .title("Help")
                .clickOutsideToClose(true)
                .htmlContent(
                    '<p>Click and hold to create or remove a control handle. <\p>'
                  + '<p>Click and drag on the empty region to move the camera. <\p>'
                  + '<p> Use the zoom slider to zoom in or out. <\p> '
                  + '<p> Edit knot vectors by clicking the abacus button on the top right. <\p>')
                .ok('Close')
                .targetEvent(ev)
            );
        };

        $scope.openBottomSheet = function (ev) {
            if (bsplineEditor.getSelectedBSpline() == -1) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Select a curve first.')
                        .position('bottom right')
                        .hideDelay(3000)
                );
                return;
            }
            if (knotEditorOpen == true) {
                $scope.closeBottomSheet();
                return;
            }
            knotEditorOpen = true;
            $scope.alert = '';
            $mdBottomSheet.show({
                templateUrl: 'bottom-sheet-grid-template.html',
                controller: 'KnotEditorCtrl',
                // clickOutsideToClose: false,
                disableBackdrop: false,
                disableParentScroll: true
            }).then(function (clickedItem) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent(clickedItem['name'] + ' clicked!')
                        .position('bottom right')
                        .hideDelay(1500)
                );
            }).catch(function (error) {
                // User clicked outside or hit escape
            });
        };

        $scope.closeBottomSheet = function (ev) {
            $mdBottomSheet.hide();
            console.log("closing");
            knotEditorOpen = false;
        }
    })
    .controller('KnotEditorCtrl', function ($scope, $mdToast, $mdBottomSheet, $timeout, $mdDialog) {
        $scope.data = {
            editingU: bsplineEditor.editingU,
            curve: bsplineEditor.getSelectedBSpline(),
            degree: (bsplineEditor.editingU) ?  bsplineEditor.getSelectedBSpline().getUDegree() : bsplineEditor.getSelectedBSpline().getVDegree(),
            minDegree: 1,
            maxDegree: (bsplineEditor.editingU) ? bsplineEditor.getSelectedBSpline().getNumUControlPoints() - 1 : bsplineEditor.getSelectedBSpline().getNumVControlPoints() - 1,
            makeOpen: (bsplineEditor.editingU) ? bsplineEditor.getSelectedBSpline().is_u_open : bsplineEditor.getSelectedBSpline().is_v_open,
            makeUniform: (bsplineEditor.editingU) ? bsplineEditor.getSelectedBSpline().is_u_uniform : bsplineEditor.getSelectedBSpline().is_v_uniform
        };
        $timeout(function () {
            knotEditor.initializeWebGL();
            knotEditor.setBSpline($scope.data.curve);
            knotEditor.updateBasisFunctions();
            bsplineEditor.backup();
        });
        $scope.listItemClick = function () {
        };
        $scope.$on("$destroy", function () {
            knotEditor.clearWebGL();
            bsplineEditor.backup();
            knotEditorOpen = false;
        });
        $scope.updateDegree = function () {
            if ($scope.data.editingU)
                $scope.data.curve.setUDegree($scope.data.degree);
            else 
                $scope.data.curve.setVDegree($scope.data.degree);
            // knotEditor.generateUniformFloatingKnotVector();
            knotEditor.updateBasisFunctions();
            bsplineEditor.backup();
        }
        $scope.increaseDegree = function () {
            if ($scope.data.degree >= 8) {
                var confirm = $mdDialog.confirm()
                    .title('Are you sure you like to increase the degree further?')
                    .textContent('A higher degree may decrease performance.')
                    .ariaLabel('Increase Degree Warning')
                    .ok('Please do it!')
                    .cancel('Cancel');

                $mdDialog.show(confirm).then(function () {
                    if (($scope.data.degree < $scope.data.maxDegree) && ($scope.data.degree < 100)) {
                        $scope.data.degree++;
                    } else {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Maximum degree reached.')
                                .position('bottom right')
                                .hideDelay(3000)
                        );
                    }
                    $scope.updateDegree();
                }, function () {
                });
            }
            else {
                if (($scope.data.degree < $scope.data.maxDegree) && ($scope.data.degree < 100)) {
                    $scope.data.degree++;
                } else {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Maximum degree reached.')
                            .position('bottom right')
                            .hideDelay(3000)
                    );
                }
                $scope.updateDegree();
            }
        }
        $scope.decreaseDegree = function () {
            if ($scope.data.degree > $scope.data.minDegree) {
                $scope.data.degree--;
            } else {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Minimum degree reached.')
                        .position('bottom right')
                        .hideDelay(3000)
                );
            }
            $scope.updateDegree();
        }

        $scope.updateUniformProperty = function () {
            if (bsplineEditor.editingU)
                $scope.data.curve.setUUniformity($scope.data.makeUniform);
            else 
                $scope.data.curve.setVUniformity($scope.data.makeUniform);

            knotEditor.updateBasisFunctions();
        }

        $scope.updateOpenProperty = function () {
            if (bsplineEditor.editingU)
                $scope.data.curve.setUOpen($scope.data.makeOpen);
            else 
                $scope.data.curve.setVOpen($scope.data.makeOpen);

            knotEditor.updateBasisFunctions();
        }

        $scope.updateEditingUVProperty = function() {
            bsplineEditor.editingU = $scope.data.editingU;
            knotEditor.editingU = $scope.data.editingU;

            $scope.data = {
                editingU: bsplineEditor.editingU,
                curve: bsplineEditor.getSelectedBSpline(),
                degree: (bsplineEditor.editingU) ?  bsplineEditor.getSelectedBSpline().getUDegree() : bsplineEditor.getSelectedBSpline().getVDegree(),
                minDegree: 1,
                maxDegree: (bsplineEditor.editingU) ? bsplineEditor.getSelectedBSpline().getNumUControlPoints() - 1 : bsplineEditor.getSelectedBSpline().getNumVControlPoints() - 1,
                makeOpen: (bsplineEditor.editingU) ? bsplineEditor.getSelectedBSpline().is_u_open : bsplineEditor.getSelectedBSpline().is_v_open,
                makeUniform: (bsplineEditor.editingU) ? bsplineEditor.getSelectedBSpline().is_u_uniform : bsplineEditor.getSelectedBSpline().is_v_uniform
            }
            
            $scope.updateUniformProperty();
            $scope.updateOpenProperty();
            $scope.updateDegree();
            knotEditor.updateBasisFunctions();


        }
    });