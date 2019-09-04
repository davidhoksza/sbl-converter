var minervaApi = "https://minerva-dev.lcsb.uni.lu/minerva-proxy/?url=https://minerva-dev.lcsb.uni.lu/minerva/api/";
var minervaApiConvert = minervaApi + "convert/";
var minervaToken;
var inputFile;
var fileName;



$(document).ready(function () {
    getMinervaToken().then(() => {
        $('#inputFile').on("change", event => processInputFile(event));
        $('#convert').on("click", convert);
    })
});

function getMinervaToken() {
    const request = new Request(minervaApi + "doLogin", {method: 'POST', body: "login=anonymous&password="});

    return fetch(request)
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else {
                throw new Error('Something went wrong on api server!');
            }
        })
        .then(response => {
            minervaToken = response["token"];
        }).catch(error => {
        console.error(error);
    });
    
}

function processInputFile(event) {

    var auxVal = $('#inputFile').val();

    if (!auxVal) return;

    fileName = $('#inputFile').val().split("\\").pop();
    $('.custom-file-label').addClass("selected").html(fileName);

    var reader = new FileReader();
    reader.onload = function(event) {
        inputFile = event.target.result;

        if (inputFile.indexOf("<celldesigner:extension>") >= 0) {
            $('#inputType option:contains(CellDesigner)').prop('selected',true);
        } else if (inputFile.indexOf('<sbgn') >= 0) {
            $('#inputType option:contains(SBGN)').prop('selected',true);
        } else {
            $('#inputType option:contains(SBML)').prop('selected',true);
        }

        preview();

    };

    reader.readAsText($('#inputFile')[0].files[0]);
}

function preview(apiAddress, body){

    var inputType = modInput($("#inputType option:selected").text());
    var apiAddress = `${minervaApiConvert}image/${inputType}:svg`;

    $("#preview-card .card-body").empty();
    $('#preview-card').removeClass('d-none');
    $("#preview-card .card-header").empty();
    $("#preview-card .card-header").append('Retrieving preview <i id=\"spinner\" class=\"fa fa-spinner fa-spin fa-1x fa-fw\"></i>');

    fetch(createRequest(apiAddress, inputFile))
        .then(response => {
            $("#preview-card .card-header").empty();
            $("#preview-card .card-header").append('Preview');
            if (response.status === 200) {
                return response.text();
            } else {
                throw new Error('Something went wrong on api server!');
            }
        })
        .then(svg => {
            $("#preview-card .card-body").append(svg);
        }).catch(error => {
            $("#preview-card .card-header").empty();
            $("#preview-card .card-header").append('Preview');
    });

}

var modInput = function (input) {
    if (input === "CellDesigner") input += "_SBML";
    if (input === "SBGN") input += "-ML";
    if (input === "PDF" || input === "PNG" || input === "SVG") input = input.toLowerCase(); //converting to lower case since image format names are required to be lower case by the MIENRVA API (in verstion 13 - should change in the future to be case insensitive)

    return input;
} ;

var convert = function() {

    const addAlert = function (message) {
        $("#input-card .card-body").append(`
            <div id="alertNoInputFile" class="alert alert-danger alert-dismissible fade show">
                <button type="button" class="close" data-dismiss="alert">&times;</button>
                <strong>Error!</strong> ${message}
            </div>
        `);
    };

    $(".alert").alert('close');

    let error = false;
    if (inputFile === undefined ) {
        addAlert("The input file not selected or not loaded.");
        error = true;
    }
    if ($("#inputType option:selected").val() == "0") {
        addAlert("The input type not selected.");
        error = true;
    }
    if ($("#outputType option:selected").val() == "0") {
        addAlert("The output type not selected.");
        error = true;
    }
    if (error) {
        return;
    }

    var inputType = modInput($("#inputType option:selected").text());
    var outputType = modInput($("#outputType option:selected").text());


    var isImage = outputType === "pdf" || outputType === "png" || outputType === "svg";
    var isBinary = outputType === "pdf" || outputType === "png";

    var apiAddress = isImage ? `${minervaApiConvert}image/`: minervaApiConvert ;
    apiAddress += `${inputType}:${outputType}`;

    // var headers = new Headers();
    // headers.append('Cookie', `MINERVA_ATUH_TOKEN=${minervaToken}`);
    // headers.append('Set-cookie', `MINERVA_ATUH_TOKEN=${minervaToken}`);
    // const request = new Request(apiAddress, {method: 'POST', body: inputFile, headers: headers/*, credentials: "include"*/});

    $("#spinner").removeClass('d-none');
    fetch(createRequest(apiAddress, inputFile))
        .then(response => {
            $("#spinner").addClass('d-none');
            if (response.status === 200) {
                return response.blob();
            } else {
                throw new Error('Something went wrong on api server!');
            }
        })
        .then(blob => {

            var suffix = outputType.toLowerCase();
            if (suffix === "celldesigner") suffix = 'xml';

            saveAs(blob, `${fileName}.${suffix}`);

        }).catch(error => {
        $("#spinner").addClass('d-none');
        console.error(error);
    });
};

function createRequest(apiAddress, body){
    var headers = new Headers();
    headers.append('Cookie', `MINERVA_ATUH_TOKEN=${minervaToken}`);
    headers.append('Set-cookie', `MINERVA_ATUH_TOKEN=${minervaToken}`);
    return new Request(apiAddress, {method: 'POST', body: body, headers: headers/*, credentials: "include"*/});
}