import dotenv from 'dotenv';
import readline from 'readline';
import {
  createInitialAdminAccount,
  checkAdminStatus,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_NAME,
} from '../server/initAdminService.js';

dotenv.config();

function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue);
    });
  });
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    email: '',
    password: '',
    name: '',
    force: false,
    mustChangePassword: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      options.email = arg.slice(8).trim();
    } else if (arg.startsWith('--password=')) {
      options.password = arg.slice(11).trim();
    } else if (arg.startsWith('--name=')) {
      options.name = arg.slice(7).trim();
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--must-change-password') {
      options.mustChangePassword = true;
    }
  }

  // Fallbacks to environment variables if passed
  if (!options.email && process.env.INITIAL_ADMIN_EMAIL) {
    options.email = process.env.INITIAL_ADMIN_EMAIL.trim();
  }
  if (!options.password && process.env.INITIAL_ADMIN_PASSWORD) {
    options.password = process.env.INITIAL_ADMIN_PASSWORD.trim();
  }
  if (!options.name && process.env.INITIAL_ADMIN_NAME) {
    options.name = process.env.INITIAL_ADMIN_NAME.trim();
  }

  return options;
}

async function runCli() {
  console.log('====================================================');
  console.log(' EduMentorX — Real Administrator Registration CLI   ');
  console.log('====================================================');

  const cliOptions = parseCliArgs();

  let targetEmail = cliOptions.email;
  let targetName = cliOptions.name;
  let targetPassword = cliOptions.password;
  const isForce = cliOptions.force;
  const mustChangePassword = cliOptions.mustChangePassword;

  // If interactive and email not provided via CLI flags
  if (!targetEmail) {
    targetEmail = await prompt('Enter Admin Email', DEFAULT_ADMIN_EMAIL);
  }

  try {
    const status = await checkAdminStatus(targetEmail);

    if (!status.isInitialized || status.error) {
      console.error('\n[INITIALIZATION ERROR]:', status.error || 'Firebase Admin SDK is not initialized.');
      console.error('\nTroubleshooting:');
      console.error('  1. Check service account key in: server/firebase-service-account.json');
      console.error('  2. Or set: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"');
      process.exit(1);
    }

    if (status.hasAdmin && !isForce) {
      console.log('\n[NOTICE]: Admin account is already fully configured in Auth and Firestore!');
      console.log(`  Email: ${status.adminEmail}`);
      console.log(`  UID:   ${status.authUid}`);
      console.log('\nTo reset this admin\'s password or update claims, re-run with --force:');
      console.log(`  npm run init-admin -- --email="${targetEmail}" --password="<NewPassword123!>" --force`);
      process.exit(0);
    }

    if (!targetName) {
      targetName = await prompt('Enter Admin Full Name', DEFAULT_ADMIN_NAME);
    }

    if (!targetPassword) {
      targetPassword = await prompt(`Enter secure password for ${targetEmail} (min 8 chars)`);
    }

    if (!targetPassword || targetPassword.length < 8) {
      console.error('\n[ERROR]: Password must be at least 8 characters long.');
      process.exit(1);
    }

    console.log(`\nRegistering admin account [${targetEmail}] in Firebase Auth & Firestore...`);
    const result = await createInitialAdminAccount(targetPassword, {
      email: targetEmail,
      name: targetName,
      force: isForce,
      mustChangePassword,
    });

    if (result.success) {
      console.log('\n====================================================');
      console.log(' SUCCESS: REAL ADMIN REGISTERED SUCCESSFULLY       ');
      console.log('====================================================');
      console.log(` User ID:     ${result.uid}`);
      console.log(` Name:        ${result.name}`);
      console.log(` Email:       ${result.email}`);
      console.log(` Role:        admin (Custom Claims: role="admin", admin=true)`);
      console.log(` Firestore:   /users/${result.uid} profile created`);
      console.log(` Created At:  ${result.createdAt}`);
      console.log(` Must Change: ${result.mustChangePassword ? 'Yes' : 'No (immediate login ready)'}`);
      console.log('----------------------------------------------------');
      console.log(' You can now log into EduMentorX:');
      console.log(' 1. Select Role: "Administrator"');
      console.log(` 2. Email:       ${result.email}`);
      console.log(` 3. Password:    ${targetPassword}`);
      console.log('====================================================\n');
    } else {
      console.error('\n[REFUSED]:', result.message);
    }
  } catch (err) {
    console.error('\n[REGISTRATION ERROR]:', err.message);
    process.exit(1);
  }
}

runCli();
