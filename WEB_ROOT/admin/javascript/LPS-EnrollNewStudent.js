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

  function scrollToTop() {
    try {
      var feedback = document.getElementById("page-feedback-message");
      if (feedback && typeof feedback.scrollIntoView === "function") {
        feedback.scrollIntoView({ block: "start", behavior: "auto" });
      }

      var contentMain = document.getElementById("content-main");
      var container = document.getElementById("container");
      var targets = [];
      if (contentMain) {
        targets.push(contentMain);
      }
      if (container) {
        targets.push(container);
      }
      if (document.scrollingElement) {
        targets.push(document.scrollingElement);
      }
      targets.push(document.documentElement);
      targets.push(document.body);

      var i;
      for (i = 0; i < targets.length; i++) {
        if (targets[i]) {
          targets[i].scrollTop = 0;
        }
      }
      if (window.$j) {
        $j(document).scrollTop(0);
        if (contentMain) {
          $j(contentMain).scrollTop(0);
        }
        if (container) {
          $j(container).scrollTop(0);
        }
      } else {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    } catch (e) {}

    try {
      window.scrollTo(0, 0);
    } catch (e) {}
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

  function findFieldByRowLabel(labelText, fieldType, allowDisabled) {
    var target = text(labelText).toLowerCase();
    var $found = $j();

    $j("td.bold, span.bold").each(function () {
      var $label = $j(this);
      var current = text($label.text()).toLowerCase();
      if (!current || current.indexOf(target) !== 0) {
        return;
      }

      var $row = $label.closest("tr");
      if (!$row.length) {
        return;
      }

      if (fieldType === "select") {
        $found = allowDisabled
          ? $row.find("select").first()
          : $row.find("select").filter(":enabled").first();
      } else {
        $found = allowDisabled
          ? $row.find("input[type='text'], input:not([type]), textarea").first()
          : $row.find("input[type='text'], input:not([type]), textarea").filter(":enabled").first();
      }
      return false;
    });

    return $found;
  }

  function findField(selectors, rowLabel, fieldType, allowDisabled) {
    var i;
    for (i = 0; i < selectors.length; i++) {
      var $el = $j(selectors[i]).filter(":enabled").first();
      if ($el.length) {
        return $el;
      }
    }
    if (allowDisabled) {
      for (i = 0; i < selectors.length; i++) {
        var $fallback = $j(selectors[i]).first();
        if ($fallback.length) {
          return $fallback;
        }
      }
    }
    return findFieldByRowLabel(rowLabel, fieldType, allowDisabled);
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
    var checks = [
      {
        selectors: ['select[name="districtofresidence"]'],
        rowLabel: "District of Residence",
        fieldType: "select",
        errorId: "#invalid_district_of_residence_error"
      },
      {
        selectors: ["#MA_SAS_Resident", 'select[name="MA_SAS_Resident"]'],
        rowLabel: "Resident",
        fieldType: "select",
        errorId: "#invalid_resident_error"
      },
      {
        selectors: ["#MA_SIF_FTE", 'select[name="MA_SIF_FTE"]'],
        rowLabel: "SIF FTE",
        fieldType: "select",
        errorId: "#invalid_sif_fte_error"
      },
      {
        selectors: ["#MA_BirthCity", 'input[name="MA_BirthCity"]'],
        rowLabel: "City/Town of Birth",
        fieldType: "text",
        errorId: "#invalid_birth_city_error"
      },
      {
        selectors: ["#MA_City", 'select[name="MA_City"]'],
        rowLabel: "City/Town of Residence - Student",
        fieldType: "select",
        errorId: "#invalid_city_residence_student_error"
      },
      {
        selectors: ['select[name="fteid"]'],
        rowLabel: "Full-Time Equivalency",
        fieldType: "select",
        errorId: "#invalid_fte_error",
        allowDisabled: true
      }
    ];
    var i;

    hideCustomErrors();
    for (i = 0; i < checks.length; i++) {
      var clearField = findField(checks[i].selectors, checks[i].rowLabel, checks[i].fieldType, checks[i].allowDisabled);
      if (clearField.length) {
        clearFieldState(clearField);
      }
    }

    for (i = 0; i < checks.length; i++) {
      var check = checks[i];
      var $field = findField(check.selectors, check.rowLabel, check.fieldType, check.allowDisabled);
      var filled = true;
      if (!$field.length) {
        continue;
      }

      filled = check.fieldType === "select" ? hasSelectValue($field) : hasTextValue($field);
      if (!filled) {
        valid = false;
        markFieldMissing($field);
        showError(check.errorId);
      }
    }

    if (!valid) {
      scrollToTop();
    }

    return valid;
  }

  function wrapNativeValidation() {
    if (typeof window.validateStudentEnrollment !== "function") {
      return;
    }
    if (window.validateStudentEnrollment.__lpsWrapped) {
      return;
    }

    var original = window.validateStudentEnrollment;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      if (!result) {
        scrollToTop();
      }
      return result;
    };
    wrapped.__lpsWrapped = true;
    window.validateStudentEnrollment = wrapped;
  }

  function bindSubmitInterceptor() {
    var form = document.getElementById("studentEnrollmentForm");
    if (!form || form.__lpsSubmitInterceptorBound) {
      return;
    }
    form.__lpsSubmitInterceptorBound = true;

    ensureErrorItem("invalid_district_of_residence_error", "You must select a District of Residence.");
    ensureErrorItem("invalid_resident_error", "You must select a Resident value.");
    ensureErrorItem("invalid_sif_fte_error", "You must select a SIF FTE value.");
    ensureErrorItem("invalid_birth_city_error", "You must enter a City/Town of Birth.");
    ensureErrorItem("invalid_city_residence_student_error", "You must select a City/Town of Residence - Student.");
    ensureErrorItem("invalid_fte_error", "You must select a Full-Time Equivalency.");

    form.addEventListener("invalid", function () {
      scrollToTop();
    }, true);

    form.addEventListener("submit", function (event) {
      if (runCustomValidation()) {
        return;
      }

      scrollToTop();
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      if (typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
      if (window.console && typeof window.console.warn === "function") {
        window.console.warn("[LPS-EnrollNewStudent] submit blocked: multiple required fields missing.");
      }
      return false;
    }, true);
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
      wrapNativeValidation();
      bindSubmitInterceptor();
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
