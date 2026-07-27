<?php
/**
 * TechMonx contact / booking / chat form handler.
 * Receives POSTs from the "Let's Connect" form, the Book a Meeting modal,
 * and the TechMonx Assistant chat widget, and emails them to info@techmonx.co.uk.
 * No credentials or third-party services required — uses PHP's built-in mail().
 */

header('Content-Type: application/json; charset=utf-8');

// Only allow same-origin requests from the live site.
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

$to = 'info@techmonx.co.uk';
$formType = clean($_POST['form_type'] ?? 'contact');

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

    $subject = 'New meeting request from ' . $name;
    $body  = "New meeting request via techmonx.co.uk\n\n";
    $body .= "Name: $name\nEmail: $email\nPreferred date: $date\nPreferred time: $time\nNotes: $notes\n";
    $replyTo = $email;

} elseif ($formType === 'chat') {
    $email   = clean($_POST['email'] ?? '');
    $message = clean($_POST['message'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Please enter a valid email and message.']);
        exit;
    }

    $subject = 'New enquiry via TechMonx site chat';
    $body  = "New chat enquiry via techmonx.co.uk\n\n";
    $body .= "From: $email\n\nMessage:\n$message\n";
    $replyTo = $email;

} else {
    $first   = clean($_POST['first_name'] ?? '');
    $last    = clean($_POST['last_name'] ?? '');
    $email   = clean($_POST['email'] ?? '');
    $service = clean($_POST['service'] ?? '');
    $details = clean($_POST['details'] ?? '');

    if ($first === '' || $last === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Please fill in all required fields.']);
        exit;
    }

    $subject = "New enquiry from $first $last" . ($service ? " — $service" : '');
    $body  = "New contact form submission via techmonx.co.uk\n\n";
    $body .= "Name: $first $last\nEmail: $email\nService: $service\n\nProject details:\n$details\n";
    $replyTo = $email;
}

$headers   = [];
$headers[] = 'From: TechMonx Website <noreply@techmonx.co.uk>';
$headers[] = 'Reply-To: ' . $replyTo;
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'X-Mailer: TechMonx-Site';

$sent = @mail($to, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not send your message right now. Please email us directly at info@techmonx.co.uk.']);
}
