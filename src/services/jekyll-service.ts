// Jekyll configuration service for generating dynamic Jekyll files
// Creates _config.yml and Gemfile based on tutorial metadata

import { z } from "zod";

// Schema for Jekyll configuration options
export const JekyllConfigSchema = z.object({
	siteTitle: z.string(),
	description: z.string().optional(),
	githubUrl: z.string().optional(),
	authorName: z.string().default("PocketFlowTS"),
	authorUrl: z.string().optional(),
	colorScheme: z.enum(["light", "dark", "auto"]).default("light"),
	enableMermaid: z.boolean().default(true),
	enableCallouts: z.boolean().default(true),
	customNavigation: z
		.array(
			z.object({
				title: z.string(),
				url: z.string(),
			}),
		)
		.optional(),
});

export type JekyllConfig = z.infer<typeof JekyllConfigSchema>;

/**
 * Service for generating Jekyll configuration files
 */
export class JekyllService {
	/**
	 * Generates _config.yml content
	 */
	generateConfig(config: JekyllConfig): string {
		const configContent = `# Basic site settings
title: ${config.siteTitle}

# Theme settings
theme: just-the-docs

# Navigation
nav_sort: case_sensitive`;

		// Add GitHub link if provided
		const auxLinks = config.githubUrl
			? `

# Aux links (shown in upper right)
aux_links:
    "View on GitHub":
        - "${config.githubUrl}"`
			: "";

		// Color scheme section
		const colorScheme = `

# Color scheme
color_scheme: ${config.colorScheme}`;

		// Author settings
		const authorSection = `

# Author settings
author:
    name: ${config.authorName}${config.authorUrl ? `\n    url: ${config.authorUrl}` : ""}`;

		// Mermaid settings if enabled
		const mermaidSection = config.enableMermaid
			? `

# Mermaid settings
mermaid:
    version: "11.6.0"
    config: |
        direction: TB`
			: "";

		// Callouts settings if enabled
		const calloutsSection = config.enableCallouts
			? `

# Callouts settings
callouts:
    warning:
        title: Warning
        color: red
    note:
        title: Note
        color: blue
    best-practice:
        title: Best Practice
        color: green
    info:
        title: Info
        color: blue
    tip:
        title: Tip
        color: green`
			: "";

		// Custom navigation if provided
		const navigationSection =
			config.customNavigation && config.customNavigation.length > 0
				? `

# Custom navigation
nav:${config.customNavigation.map((nav) => `\n    - ${nav.title}: ${nav.url}`).join("")}`
				: "";

		return `${configContent}${auxLinks}${colorScheme}${authorSection}${mermaidSection}${calloutsSection}${navigationSection}
`;
	}

	/**
	 * Generates Gemfile content
	 */
	generateGemfile(): string {
		return `# Gemfile
source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "just-the-docs", "~> 0.4"
gem "webrick", "~> 1.7" # Required for Jekyll serve in Ruby 3+

# Jekyll plugins
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-sitemap"
end

# Windows and JRuby don't include zoneinfo files, so bundle the tzinfo-data gem
# and associated gems on Windows and JRuby platforms.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "listen", "~> 3.8", :platforms => [:mingw, :x64_mingw, :mswin]
`;
	}

	/**
	 * Generates Jekyll configuration from tutorial metadata
	 */
	generateConfigFromTutorial(
		tutorialTitle: string,
		technologies: string[],
		githubUrl?: string,
	): JekyllConfig {
		const techList = technologies.slice(0, 3).join(", ");
		const description = `Tutorial documentation for ${tutorialTitle}. Learn ${techList} and more through step-by-step guides.`;

		return {
			siteTitle: tutorialTitle,
			description,
			githubUrl,
			authorName: "PocketFlowTS",
			colorScheme: "light",
			enableMermaid: true,
			enableCallouts: true,
			customNavigation: [
				{ title: "Home", url: "index.md" },
				...(githubUrl ? [{ title: "GitHub", url: githubUrl }] : []),
			],
		};
	}

	/**
	 * Generates complete Jekyll setup files
	 */
	generateJekyllFiles(
		tutorialTitle: string,
		technologies: string[],
		githubUrl?: string,
	): {
		configYml: string;
		gemfile: string;
		config: JekyllConfig;
	} {
		const config = this.generateConfigFromTutorial(
			tutorialTitle,
			technologies,
			githubUrl,
		);

		return {
			configYml: this.generateConfig(config),
			gemfile: this.generateGemfile(),
			config,
		};
	}

	/**
	 * Validates Jekyll configuration
	 */
	validateConfig(config: unknown): { isValid: boolean; error?: string } {
		const result = JekyllConfigSchema.safeParse(config);

		if (result.success) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `Configuration validation failed: ${result.error.errors.map((e) => e.message).join(", ")}`,
		};
	}

	/**
	 * Extracts potential GitHub URL from tutorial content
	 */
	extractGitHubUrl(
		tutorialFiles: Array<{ path: string; content: string }>,
	): string | undefined {
		const allContent = tutorialFiles.map((f) => f.content).join(" ");

		// Look for GitHub URLs in content
		const githubRegex = /https:\/\/github\.com\/[\w-]+\/[\w-]+/g;
		const matches = allContent.match(githubRegex);

		if (matches && matches.length > 0) {
			// Return the first GitHub URL found
			return matches[0];
		}

		return undefined;
	}

	/**
	 * Generates README.md for Jekyll setup instructions
	 */
	generateReadme(tutorialTitle: string): string {
		return `# ${tutorialTitle} - Jekyll Documentation

This directory contains the Jekyll documentation site for the ${tutorialTitle} tutorial.

## Prerequisites

### Install Ruby (Required)

#### macOS
\`\`\`bash
# Using Homebrew (recommended)
brew install ruby

# Or using rbenv for version management
brew install rbenv ruby-build
rbenv install 3.2.0
rbenv global 3.2.0
\`\`\`

#### Ubuntu/Debian
\`\`\`bash
# Update packages
sudo apt update

# Install Ruby and development tools
sudo apt install ruby-full build-essential zlib1g-dev

# Add gem installation path to bashrc
echo '# Install Ruby Gems to ~/gems' >> ~/.bashrc
echo 'export GEM_HOME="$HOME/gems"' >> ~/.bashrc
echo 'export PATH="$HOME/gems/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
\`\`\`

#### Windows
\`\`\`bash
# Using RubyInstaller (recommended)
# 1. Download and install Ruby+Devkit from https://rubyinstaller.org/
# 2. Choose version 3.2.x with DevKit
# 3. Run the installer and follow the setup wizard
# 4. Install MSYS2 when prompted

# Or using Windows Subsystem for Linux (WSL)
# Follow Ubuntu instructions above in WSL
\`\`\`

#### Verify Installation
\`\`\`bash
ruby --version   # Should show Ruby 3.1.0 or higher
gem --version    # Should show RubyGems version
\`\`\`

### Install Bundler
\`\`\`bash
gem install bundler
bundler --version
\`\`\`

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   bundle install
   \`\`\`

2. **Serve the site locally:**
   \`\`\`bash
   bundle exec jekyll serve
   \`\`\`

3. **Open your browser to:** http://localhost:4000

4. **For development with auto-reload:**
   \`\`\`bash
   bundle exec jekyll serve --livereload
   \`\`\`

## Troubleshooting

### Common Issues

#### Permission Errors (macOS/Linux)
\`\`\`bash
# If you get permission errors, install gems locally
bundle config set --local path 'vendor/bundle'
bundle install
\`\`\`

#### Windows Encoding Issues
\`\`\`bash
# Set UTF-8 encoding
chcp 65001
set JEKYLL_ENV=development
bundle exec jekyll serve
\`\`\`

#### Port Already in Use
\`\`\`bash
# Use a different port
bundle exec jekyll serve --port 4001
\`\`\`

#### Dependencies Issues
\`\`\`bash
# Clean and reinstall
bundle clean --force
bundle install
\`\`\`

### Performance Tips

- Use \`--incremental\` for faster rebuilds during development
- Use \`--livereload\` for automatic browser refresh
- Run \`bundle exec jekyll build\` for production builds

## Project Structure

- \`_config.yml\` - Jekyll configuration
- \`Gemfile\` - Ruby dependencies
- \`index.md\` - Main tutorial index
- Chapter files (01_*, 02_*, etc.) - Individual tutorial chapters

## Customization

You can customize the site by editing:

- \`_config.yml\` for site-wide settings
- Individual markdown files for content
- Gemfile for additional Jekyll plugins

## Theme

This site uses the [Just the Docs](https://just-the-docs.github.io/just-the-docs/) theme, which provides:

- Clean, responsive design
- Built-in search functionality
- Automatic navigation sidebar
- Syntax highlighting for code
- Mobile-friendly responsive layout
- Dark/light mode support

## Additional Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Just the Docs Theme Guide](https://just-the-docs.github.io/just-the-docs/)
- [Ruby Installation Guide](https://www.ruby-lang.org/en/documentation/installation/)
- [Bundler Documentation](https://bundler.io/docs.html)

Generated by PocketFlowTS AI Tutorial Generator.
`;
	}
}

// Export default instance
export const jekyllService = new JekyllService();
