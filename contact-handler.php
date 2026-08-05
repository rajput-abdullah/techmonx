<?php
/**
 * TechMonx contact / booking / chat form handler.
 * Receives POSTs from the "Let's Connect" form, the Book a Meeting modal,
 * and the TechMonx Assistant chat widget. For every submission it:
 *   1. Computes smart tags from the visitor's own answers (service interest,
 *      budget, timeline, enquiry source).
 *   2. Logs the lead to a protected local file (leads/leads-log.jsonl) so
 *      nothing is ever lost even if email or the CRM webhook is down.
 *   3. Emails the team an instant alert with the tags up top.
 *   4. Sends the lead a short introductory auto-reply confirming receipt.
 *   5. Optionally POSTs the same lead + tags to an external CRM webhook
 *      (e.g. a Google Apps Script Web App bound to a Google Sheet) if
 *      $crmWebhookUrl below has been set.
 * No paid third-party services are required for steps 1-4 — only step 5
 * needs a webhook URL, and step 5 is skipped silently if none is set.
 */

header('Content-Type: application/json; charset=utf-8');

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------

// Paste the "Web app" URL from the Apps Script deployment here once set
// up (see /leads/apps-script-webhook.gs.txt for the script + steps).
// Leave blank to skip CRM sync and only use the local log + emails.
$crmWebhookUrl = 'https://script.google.com/macros/s/AKfycby6EJnB2kD2mUTgQ4EXoDtjH8EhIQFB3UjNVK2yyCOiSKY-15qQbR9g7ZfPlvnZgPiUiQ/exec';

$teamEmail = 'info@techmonx.co.uk';
$leadsLogFile = __DIR__ . '/leads/leads-log.jsonl';

// ---------------------------------------------------------------------

$allowed_origins = ['https://techmonx.co.uk', 'https://www.techmonx.co.uk'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

function clean($v) {
    return trim(htmlspecialchars($v ?? '', ENT_QUOTES, 'UTF-8'));
}

// Honeypot — real users never fill this in.
if (!empty($_POST['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$formType = clean($_POST['form_type'] ?? 'contact');

// ---------------------------------------------------------------------
// Smart tagging — turns the visitor's own form answers into tags a
// human (or a CRM view) can filter and act on instantly.
// ---------------------------------------------------------------------

function serviceLabel($service) {
    $map = [
        'ai-automation' => 'AI Agents & Automation',
        'starter'       => 'Business Automation – Starter',
        'growth'        => 'Business Automation – Growth',
        'pro'           => 'Business Automation – Pro',
        'web'           => 'Web Development',
        'mobile'        => 'Mobile App Development',
        'saas'          => 'SaaS Development',
        'crm'           => 'CRM Development',
        'it-cyber'      => 'IT Services & Cybersecurity',
        'uiux'          => 'UI/UX Design',
        'devops'        => 'DevOps',
        'ai-ml'         => 'AI & Machine Learning',
        'game'          => 'Game Development',
        'blockchain'    => 'Blockchain Development',
        'qa'            => 'Quality Assurance & Testing',
        'other'         => 'Other / Not Sure Yet',
    ];
    return $map[$service] ?? null;
}

function budgetLabel($budget) {
    $map = [
        'under-1k' => 'Under £1,000',
        '1k-5k'    => '£1,000–£5,000',
        '5k-15k'   => '£5,000–£15,000',
        '15k-50k'  => '£15,000–£50,000',
        '50k-plus' => '£50,000+',
        'not-sure' => 'Not sure yet',
    ];
    return $map[$budget] ?? null;
}

function timelineLabel($timeline) {
    $map = [
        'asap'     => 'ASAP / within 1 month',
        '1-3m'     => '1–3 months',
        '3-6m'     => '3–6 months',
        '6m-plus'  => '6+ months / flexible',
        'not-sure' => 'Not sure yet',
    ];
    return $map[$timeline] ?? null;
}

function sourceLabel($formType) {
    $map = [
        'contact' => 'Contact Form',
        'booking' => 'Booking Modal',
        'chat'    => 'Chat Widget',
    ];
    return $map[$formType] ?? 'Contact Form';
}

/**
 * Build the tag list for a lead. $fields may include service, budget,
 * timeline — whichever the submitting form actually collected.
 */
function computeTags($formType, $fields) {
    $tags = [];
    $tags[] = 'Source: ' . sourceLabel($formType);

    $service = $fields['service'] ?? '';
    if ($service !== '' && serviceLabel($service)) {
        $tags[] = 'Service: ' . serviceLabel($service);
    }

    $budget = $fields['budget'] ?? '';
    if ($budget !== '' && budgetLabel($budget)) {
        $tags[] = 'Budget: ' . budgetLabel($budget);
    }

    $timeline = $fields['timeline'] ?? '';
    if ($timeline !== '' && timelineLabel($timeline)) {
        $tags[] = 'Timeline: ' . timelineLabel($timeline);
    }

    // Priority flag: big budget or urgent timeline = high priority.
    $highBudget = in_array($budget, ['15k-50k', '50k-plus'], true);
    $urgent = $timeline === 'asap';
    if ($highBudget || $urgent) {
        $tags[] = 'Priority: High';
    } elseif ($formType === 'booking') {
        $tags[] = 'Priority: High'; // a booking request is always a warm lead
    } else {
        $tags[] = 'Priority: Standard';
    }

    return $tags;
}

/**
 * Append the lead to the protected local log. Never throws — a logging
 * failure must not stop the email flow.
 */
function logLead($file, $record) {
    try {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        @file_put_contents($file, json_encode($record, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
    } catch (\Throwable $e) {
        // swallow — logging is best-effort
    }
}

/**
 * POST the lead to an external CRM webhook (e.g. Google Apps Script Web
 * App). Never throws and never blocks the response to the visitor.
 */
function pushToCrm($url, $record) {
    if ($url === '' || !function_exists('curl_init')) {
        return;
    }
    try {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($record, JSON_UNESCAPED_SLASHES),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (\Throwable $e) {
        // swallow — CRM sync is best-effort, must never break the form
    }
}

function sendMail($to, $subject, $body, $fromLabel, $fromAddr, $replyTo) {
    $headers   = [];
    $headers[] = 'From: ' . $fromLabel . ' <' . $fromAddr . '>';
    $headers[] = 'Reply-To: ' . $replyTo;
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'X-Mailer: TechMonx-Site';
    return @mail($to, $subject, $body, implode("\r\n", $headers));
}

// ---------------------------------------------------------------------
// Per-form-type handling
// ---------------------------------------------------------------------

if ($formType === 'booking') {
    $name  = clean($_POST['name'] ?? '');
    $email = clean($_POST['email'] ?? '');
    $date  = clean($_POST['date'] ?? '');
    $time  = clean($_POST['time'] ?? '');
    $notes = clean($_POST['notes'] ?? '');

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $date === '' || $time === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Please fill in all required fields.']);
        exit;
    }

    $tags = computeTags('booking', []);

    $teamSubject = 'New meeting request from ' . $name;
    $teamBody  = 'Tags: ' . implode(', ', $tags) . "\n\n";
    $teamBody .= "New meeting request via techmonx.co.uk\n\n";
    $teamBody .= "Name: $name\nEmail: $email\nPreferred date: $date\nPreferred time: $time\nNotes: $notes\n";
    $replyTo = $email;

    $leadReplySubject = "We've got your meeting request, $name";
    $leadReplyBody  = "Hi $name,\n\n";
    $leadReplyBody .= "Thanks for booking time with TechMonx. We've received your request for $date at $time and will confirm by email within one business day.\n\n";
    $leadReplyBody .= "If anything changes in the meantime, just reply to this email.\n\nTechMonx\ninfo@techmonx.co.uk\n";

    $record = [
        'timestamp' => date('c'),
        'form_type' => 'booking',
        'name' => $name, 'email' => $email,
        'date' => $date, 'time' => $time, 'notes' => $notes,
        'tags' => $tags,
    ];

} elseif ($formType === 'chat') {
    $email   = clean($_POST['email'] ?? '');
    $message = clean($_POST['message'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Please enter a valid email and message.']);
        exit;
    }

    $tags = computeTags('chat', []);

    $teamSubject = 'New enquiry via TechMonx site chat';
    $teamBody  = 'Tags: ' . implode(', ', $tags) . "\n\n";
    $teamBody .= "New chat enquiry via techmonx.co.uk\n\n";
    $teamBody .= "From: $email\n\nMessage:\n$message\n";
    $replyTo = $email;

    $leadReplySubject = 'Thanks for reaching out to TechMonx';
    $leadReplyBody  = "Hi,\n\n";
    $leadReplyBody .= "Thanks for your message. A member of the TechMonx team will follow up by email shortly.\n\n";
    $leadReplyBody .= "Your message:\n\"$message\"\n\nTechMonx\ninfo@techmonx.co.uk\n";

    $record = [
        'timestamp' => date('c'),
        'form_type' => 'chat',
        'email' => $email, 'message' => $message,
        'tags' => $tags,
    ];

} else {
    $name     = clean($_POST['name'] ?? '');
    $email    = clean($_POST['email'] ?? '');
    $phone    = clean($_POST['phone'] ?? '');
    $company  = clean($_POST['company'] ?? '');
    $service  = clean($_POST['service'] ?? '');
    $budget   = clean($_POST['budget'] ?? '');
    $timeline = clean($_POST['timeline'] ?? '');
    $details  = clean($_POST['details'] ?? '');
    $consent  = !empty($_POST['consent']);

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $service === '' || $details === '' || !$consent) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Please fill in all required fields and confirm you agree to be contacted.']);
        exit;
    }

    $tags = computeTags('contact', ['service' => $service, 'budget' => $budget, 'timeline' => $timeline]);
    $serviceName = serviceLabel($service) ?? $service;

    $teamSubject = "New enquiry from $name" . ($serviceName ? " — $serviceName" : '');
    $teamBody  = 'Tags: ' . implode(', ', $tags) . "\n\n";
    $teamBody .= "New contact form submission via techmonx.co.uk\n\n";
    $teamBody .= "Name: $name\nEmail: $email\nPhone: " . ($phone !== '' ? $phone : 'n/a') . "\nCompany: " . ($company !== '' ? $company : 'n/a') .
                 "\nService: $serviceName\nBudget: " . (budgetLabel($budget) ?? 'n/a') . "\nTimeline: " . (timelineLabel($timeline) ?? 'n/a') .
                 "\n\nProject details:\n$details\n";
    $replyTo = $email;

    $leadReplySubject = "Thanks for reaching out, $name";
    $leadReplyBody  = "Hi $name,\n\n";
    $leadReplyBody .= "Thanks for telling us about your project" . ($serviceName ? " ($serviceName)" : '') . ". Someone from the TechMonx team will follow up within one business day.\n\n";
    $leadReplyBody .= "If it's urgent, reply to this email or call us on +44 7478 699355.\n\nTechMonx\ninfo@techmonx.co.uk\n";

    $record = [
        'timestamp' => date('c'),
        'form_type' => 'contact',
        'name' => $name, 'email' => $email, 'phone' => $phone, 'company' => $company,
        'service' => $service, 'service_label' => $serviceName,
        'budget' => $budget, 'timeline' => $timeline, 'details' => $details,
        'tags' => $tags,
    ];
}

// ---------------------------------------------------------------------
// 1. Log the lead locally (always, regardless of email/CRM outcome)
// ---------------------------------------------------------------------
logLead($leadsLogFile, $record);

// ---------------------------------------------------------------------
// 2. Instant team alert
// ---------------------------------------------------------------------
$sent = sendMail($teamEmail, $teamSubject, $teamBody, 'TechMonx Website', 'noreply@techmonx.co.uk', $replyTo);

// ---------------------------------------------------------------------
// 3. Instant introductory response to the lead (best-effort, never
//    blocks or fails the submission if it doesn't go through)
// ---------------------------------------------------------------------
if (isset($leadReplySubject, $leadReplyBody, $replyTo) && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
    sendMail($replyTo, $leadReplySubject, $leadReplyBody, 'TechMonx', 'info@techmonx.co.uk', $teamEmail);
}

// ---------------------------------------------------------------------
// 4. Optional CRM sync
// ---------------------------------------------------------------------
pushToCrm($crmWebhookUrl, $record);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not send your message right now. Please email us directly at info@techmonx.co.uk.']);
}
