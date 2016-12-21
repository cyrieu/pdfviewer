// execute when DOM loads
$(document).ready(function() {
  // configure dropzone
  Dropzone.options.pdfdropzone = {
    paramName: 'file',
    maxFilesize: 5, // MB
    parallelUploads: 1,
    addRemoveLinks: true,
    removedfile: function(file) {
      var _ref;
      return (_ref = file.previewElement) != null ? _ref.parentNode.removeChild(file.previewElement) : void 0;
    },
    accept: function(file, done) {
      // make sure the file is a pdf
      if (file.type !== "application/pdf") {
        done("Please upload a pdf!");
      } else {
        console.log(file);
        done();
      }
    },
    success: function(file, response) {
      console.log(file.name);
    },
  };
});
