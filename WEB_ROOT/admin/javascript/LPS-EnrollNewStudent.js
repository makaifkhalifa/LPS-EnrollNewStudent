(function () {
  "use strict";

  var PAGE_PATH = "/admin/students/newstudent.html";
  var INIT_FLAG = "__lpsEnrollNewStudentInitV2";

  function isTargetPage() {
    return (window.location && window.location.pathname || "").toLowerCase() === PAGE_PATH;
  }

  function text(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function hideTicketRows() {
    if (!window.$j) {
      return;
    }

    // Remove Legal Name/Legal Gender rows (including dynamically injected rows).
    $j("#legalNameSourceDiv, #legalGenderSourceDiv").remove();
    $j("#legalLastName").closest("tr").remove();
    $j("#legalGenderSelect").closest("tr").remove();

    // Remove MA reporting toggle rows requested in ticket.
    $j('input[name="state_excludefromreporting"]').closest("tr").remove();
    $j('input[name="MA_DOERptFlag"]').closest("tr").remove();

    $j("td.bold").each(function () {
      var label = text($j(this).text()).toLowerCase();
      if (
        label.indexOf("legal name") === 0 ||
        label === "legal gender" ||
        label.indexOf("exclude this student from state reporting") === 0 ||
        label.indexOf("include this student in the sims report") === 0
      ) {
        $j(this).closest("tr").remove();
      }
    });
  }

  function ensureErrorItem(id, message) {
    if ($j("#" + id).length) {
      return;
    }
    var $ul = $j("#page-feedback-message ul");
    if (!$ul.length) {
      return;
    }
    $ul.append($j("<li/>", { id: id, text: message }).hide());
  }

  function clearFieldState(selector) {
    $j(selector).css({ border: "", backgroundColor: "" });
  }

  function markFieldMissing(selector) {
    $j(selector).css({ border: "1px solid #b91c1c", backgroundColor: "#fff1f2" });
  }

  function showError(id) {
    $j("#page-feedback-message").show();
    $j(id).show();
  }

  function hideCustomErrors() {
    var ids = [
      "#invalid_district_of_residence_error",
      "#invalid_resident_error",
      "#invalid_sif_fte_error",
      "#invalid_birth_city_error",
      "#invalid_city_residence_student_error"
    ];
    var i;
    for (i = 0; i < ids.length; i++) {
      $j(ids[i]).hide();
    }
  }

  function hasSelectValue(selector) {
    var $el = $j(selector);
    if (!$el.length) {
      return true;
    }
    var value = text($el.val());
    var selected = text($el.find("option:selected").text()).toLowerCase();
    if (!value || value === "0") {
      return false;
    }
    if (
      selected === "please select" ||
      selected === "please select a value" ||
      selected === "select a value" ||
      selected === "- select -"
    ) {
      return false;
    }
    return true;
  }

  function hasTextValue(selector) {
    var $el = $j(selector);
    if (!$el.length) {
      return true;
    }
    return text($el.val()).length > 0;
  }

  function runCustomValidation() {
    var valid = true;
    var firstMissingSelector = null;

    clearFieldState('select[name="districtofresidence"]');
    clearFieldState("#MA_SAS_Resident");
    clearFieldState("#MA_SIF_FTE");
    clearFieldState("#MA_BirthCity");
    clearFieldState("#MA_City");
    hideCustomErrors();

    if (!hasSelectValue('select[name="districtofresidence"]')) {
      valid = false;
      markFieldMissing('select[name="districtofresidence"]');
      showError("#invalid_district_of_residence_error");
      firstMissingSelector = firstMissingSelector || 'select[name="districtofresidence"]';
    }

    if (!hasSelectValue("#MA_SAS_Resident")) {
      valid = false;
      markFieldMissing("#MA_SAS_Resident");
      showError("#invalid_resident_error");
      firstMissingSelector = firstMissingSelector || "#MA_SAS_Resident";
    }

    if (!hasSelectValue("#MA_SIF_FTE")) {
      valid = false;
      markFieldMissing("#MA_SIF_FTE");
      showError("#invalid_sif_fte_error");
      firstMissingSelector = firstMissingSelector || "#MA_SIF_FTE";
    }

    if (!hasTextValue("#MA_BirthCity")) {
      valid = false;
      markFieldMissing("#MA_BirthCity");
      showError("#invalid_birth_city_error");
      firstMissingSelector = firstMissingSelector || "#MA_BirthCity";
    }

    if (!hasSelectValue("#MA_City")) {
      valid = false;
      markFieldMissing("#MA_City");
      showError("#invalid_city_residence_student_error");
      firstMissingSelector = firstMissingSelector || "#MA_City";
    }

    if (!valid && firstMissingSelector) {
      try {
        var $first = $j(firstMissingSelector);
        if ($first.length) {
          $j(document).scrollTop(Math.max($first.offset().top - 120, 0));
          $first.focus();
        }
      } catch (e) {}
    }

    return valid;
  }

  function installValidationHook() {
    if (typeof window.validateStudentEnrollment !== "function") {
      return false;
    }
    if (window.__lpsValidateEnrollmentWrapped) {
      return true;
    }

    ensureErrorItem("invalid_district_of_residence_error", "You must select a District of Residence.");
    ensureErrorItem("invalid_resident_error", "You must select a Resident value.");
    ensureErrorItem("invalid_sif_fte_error", "You must select a SIF FTE value.");
    ensureErrorItem("invalid_birth_city_error", "You must enter a City/Town of Birth.");
    ensureErrorItem("invalid_city_residence_student_error", "You must select a City/Town of Residence - Student.");

    var originalValidate = window.validateStudentEnrollment;
    var originalHideErrors = window.hideErrors;

    if (typeof originalHideErrors === "function") {
      window.hideErrors = function () {
        originalHideErrors();
        hideCustomErrors();
      };
    }

    window.validateStudentEnrollment = function () {
      var originalLoadingDialog = window.loadingDialog;
      var originalJoinApartment = window.joinApartment;
      var baseValid;
      var customValid;
      var overallValid;

      // Run original validation but defer its side effects until both validations pass.
      window.loadingDialog = function () {};
      window.joinApartment = function () { return true; };

      baseValid = originalValidate();
      customValid = runCustomValidation();
      overallValid = !!(baseValid && customValid);

      window.loadingDialog = originalLoadingDialog;
      window.joinApartment = originalJoinApartment;

      if (overallValid) {
        if (typeof window.loadingDialog === "function") {
          window.loadingDialog();
        }
        if (typeof window.joinApartment === "function") {
          window.joinApartment();
        }
      } else {
        $j(document).scrollTop(0);
      }

      if (window.console && typeof window.console.warn === "function" && !overallValid) {
        window.console.warn("[LPS-EnrollNewStudent] submit blocked: required fields missing.");
      }

      return overallValid;
    };

    window.__lpsValidateEnrollmentWrapped = true;
    return true;
  }

  function init() {
    if (!isTargetPage() || !window.$j) {
      return;
    }
    if (window[INIT_FLAG]) {
      return;
    }
    window[INIT_FLAG] = true;

    if (window.console && typeof window.console.info === "function") {
      window.console.info("[LPS-EnrollNewStudent] initialized on " + window.location.pathname);
    }

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      hideTicketRows();
      installValidationHook();
      if (attempts >= 100) {
        window.clearInterval(timer);
      }
    }, 100);

    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(function () {
        hideTicketRows();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
