# PLAN-MERMAID - Implementation Roadmap for PocketFlowTS

## 🎯 **Mission Critical Objective**

**Restore and enhance Mermaid diagram functionality** that was lost in the Express to Elysia migration, implementing it with modern TypeScript, Zod schemas, and structured AI outputs to **exceed the original capabilities**.

## 📋 **Prerequisites Verification**

Before starting implementation, verify these requirements are met:

- ✅ **PLAN-CACHE.agents.md** - Universal cache system MUST be implemented first (CRITICAL DEPENDENCY)
- ✅ **CACHE.agents.md** - Universal cache technical specification (REQUIRED)
- ✅ **MERMAID.agents.md** - Complete technical specification (CREATED)
- ✅ **JEKYLL.agents.md** - Jekyll integration guide (EXISTS)
- ✅ **TODO.agents.md** - Current project status (EXISTS)
- ✅ **CLAUDE.md** - Development standards (EXISTS)
- ✅ Current PocketFlowTS architecture with Elysia + Vercel AI SDK
- ✅ **Universal CacheService** - Fully implemented and tested (BLOCKING DEPENDENCY)

## ⚠️ **CRITICAL DEPENDENCY WARNING**

**THIS PLAN CANNOT BE EXECUTED** until PLAN-CACHE.agents.md is **100% complete**. The Mermaid system relies on the universal caching system for:
- AI-generated diagram content caching
- Performance optimization (diagram generation in <30 seconds)
- Cost reduction (avoid regenerating same diagrams)
- Consistent caching strategy across the application

**Estimated PLAN-CACHE completion time:** 2 weeks  
**Only proceed with PLAN-MERMAID after:** CacheService fully implemented and tested

---

## 🚀 **Phase 1: Foundation Setup (Priority: CRITICAL)**

### **Step 1.1: Create DiagramService Foundation**
**Estimated Time:** 45 minutes
**Files to Create/Modify:**
- `src/services/diagram-service.ts` (NEW)
- `src/types/tutorial.ts` (MODIFY - add diagram types)

**Implementation Tasks:**
```typescript
// 1.1.1 - Create basic DiagramService class
export class DiagramService {
    // Core methods from MERMAID.agents.md specification
    generateProjectArchitectureDiagram()
    sanitizeForMermaid() // CRITICAL - prevents rendering failures
    validateDiagram()
    determineNodeShape()
    determineArrowType()
}

// 1.1.2 - Add diagram types to tutorial.ts
export interface DiagramConfig {
    type: DiagramType;
    title?: string;
    description?: string;
    theme?: 'default' | 'dark' | 'forest' | 'neutral';
    direction?: 'TD' | 'TB' | 'BT' | 'RL' | 'LR';
}

export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state';
```

**Acceptance Criteria:**
- [ ] DiagramService class compiles without errors
- [ ] sanitizeForMermaid function handles all special characters
- [ ] Basic project architecture diagram generation works
- [ ] TypeScript types are properly defined

### **Step 1.2: Implement Character Sanitization (CRITICAL)**
**Estimated Time:** 30 minutes
**Why Critical:** This prevents 90% of diagram rendering failures

**Implementation:**
```typescript
// Copy EXACT implementation from MERMAID.agents.md
sanitizeForMermaid(text: string): string {
    return text
        .replace(/"/g, '#quot;')      // Quotes break string literals
        .replace(/\(/g, '#lpar;')     // Parentheses break node syntax
        .replace(/\)/g, '#rpar;')     // Parentheses break node syntax
        // ... (complete implementation from spec)
}
```

**Testing Requirements:**
- [ ] Test with special characters: `"()[]{}|;:-->`
- [ ] Test with multi-line text
- [ ] Test with non-English characters
- [ ] Test with empty/null inputs

### **Step 1.3: Create Validation System**
**Estimated Time:** 30 minutes
**Files to Create:** `src/services/mermaid-validator.ts` (NEW)

**Implementation:**
```typescript
export class MermaidValidator {
    validateDiagramSyntax(code: string, type: string): ValidationResult
    private validateBraces()
    private validateArrows()
    private validateQuotes()
}
```

**Acceptance Criteria:**
- [ ] Validates diagram type declarations
- [ ] Catches mismatched braces/brackets
- [ ] Detects malformed arrows
- [ ] Reports clear error messages

---

## 🔧 **Phase 2: AI Integration (Priority: HIGH)**

**Note:** This phase leverages the universal cache system implemented in PLAN-CACHE. All AI-generated diagram content will be automatically cached, providing dramatic performance improvements.

### **Step 2.1: Update AI Service Schemas**
**Estimated Time:** 45 minutes
**Files to Modify:**
- `src/services/ai-service.ts` (MODIFY)

**Implementation Tasks:**
```typescript
// 2.1.1 - Enhance writeChapter schema to include diagrams
const writeChapterWithDiagramsSchema = z.object({
    // ... existing fields ...
    sections: z.array(z.object({
        heading: z.string(),
        content: z.string(),
        codeExamples: z.array(z.string()),
        diagrams: z.array(z.object({
            type: z.enum(['flowchart', 'sequence', 'class', 'state']),
            title: z.string(),
            mermaidCode: z.string(),
            description: z.string(),
            educationalPurpose: z.string()
        })).optional()
    })),
});

// 2.1.2 - Update AI prompts with Mermaid instructions
const MERMAID_PROMPT_INSTRUCTIONS = `
IMPORTANT - MERMAID DIAGRAMS:
When explaining complex concepts, include Mermaid diagrams:
1. Flowcharts for process flows
2. Sequence diagrams for API interactions  
3. Class diagrams for code architecture
4. State diagrams for workflow states
...
`;
```

**Acceptance Criteria:**
- [ ] Zod schemas compile and validate correctly
- [ ] AI prompts include comprehensive Mermaid instructions
- [ ] Structured outputs include diagram data
- [ ] Type safety maintained throughout
- [ ] Universal cache system automatically handles AI responses with diagrams

### **Step 2.2: Enhance AI Prompts for Diagram Generation**
**Estimated Time:** 30 minutes

**Implementation:**
```typescript
// Update writeChapter method to include diagram instructions
async writeChapter(
    abstraction: IdentifyAbstractionsOutput["abstractions"][0],
    files: FetchedFile[],
    relatedAbstractions: string[],
    chapterNumber: number,
    language: string = "english",
    options: CacheOptions = {} // Universal cache options
): Promise<WriteChapterOutput> {
    
    const prompt = `${basePrompt}
    
    ${MERMAID_PROMPT_INSTRUCTIONS}
    
    Structure the chapter with diagrams that clarify complex concepts.`;
    
    // Use universal cache system from PLAN-CACHE
    const result = await this.generateObjectWithCache(
        prompt,
        writeChapterWithDiagramsSchema,
        options
    );
    
    return result.object;
}
```

**Acceptance Criteria:**
- [ ] AI receives clear diagram generation instructions
- [ ] Prompts specify appropriate diagram types for different concepts
- [ ] Language parameter affects diagram text language
- [ ] Educational purpose is emphasized
- [ ] Universal cache system provides automatic caching for diagram-enhanced chapters

---

## 🔄 **Phase 3: Pipeline Integration (Priority: HIGH)**

**Note:** This phase benefits from the universal cache system. AI-generated content with diagrams will be cached automatically, and streaming responses will include cache hit/miss information.

### **Step 3.1: Integrate DiagramService into TutorialPipeline**
**Estimated Time:** 45 minutes (reduced due to cache system handling complexity)
**Files to Modify:**
- `src/services/pipeline.ts` (MODIFY)

**Implementation Tasks:**
```typescript
// 3.1.1 - Add diagram generation step to pipeline with cache integration
export class TutorialPipeline {
    private diagramService = new DiagramService();
    
    async* generateTutorial(options: TutorialOptions): AsyncGenerator<StreamingResponse> {
        const cacheOptions: CacheOptions = {
            useCache: options.useCache ?? true,
            ttl: options.cacheTTL || 7 * 24 * 60 * 60 * 1000,
        };

        // ... existing steps with cache options ...
        
        // NEW STEP: Generate project architecture diagram
        yield { type: "step_start", step: { step: 6, name: "Generating architecture diagram" } };
        
        // DiagramService generates pure diagram code (no caching here)
        // Caching is handled at AI Service level for diagram-enhanced content
        const projectDiagram = this.diagramService.generateProjectArchitectureDiagram(
            abstractionsResult.abstractions,
            relationshipsResult.relationships,
            {
                type: 'flowchart',
                direction: 'TD',
                title: `${projectName} Architecture Overview`
            }
        );
        
        yield { 
            type: "step_complete", 
            step: { step: 6, tokens: 0 },
            metadata: { diagramGenerated: true }
        };
        
        // ... continue with remaining steps
    }
}
```

**Acceptance Criteria:**
- [ ] Pipeline includes diagram generation step
- [ ] Project architecture diagram is created
- [ ] Streaming updates include diagram progress
- [ ] Error handling for diagram failures
- [ ] Cache options passed to all AI service calls
- [ ] Performance benefits from universal cache system visible

### **Step 3.2: Update Index Content Generation**
**Estimated Time:** 30 minutes

**Implementation:**
```typescript
// 3.2.1 - Modify generateIndexContent to include project diagram
private generateIndexContent(
    chapters: WriteChapterOutput[],
    ordering: OrderChaptersOutput,
    relationships: AnalyzeRelationshipsOutput,
    abstractionsResult: IdentifyAbstractionsOutput, // ADD THIS PARAMETER
    projectName: string,
): string {

    // Generate project architecture diagram
    const projectDiagram = this.diagramService.generateProjectArchitectureDiagram(
        abstractionsResult.abstractions,
        relationships.relationships
    );

    return `# ${projectName} - Tutorial Guide

${relationships.projectSummary}

## Project Architecture Overview

\`\`\`mermaid
${projectDiagram}
\`\`\`

## Learning Path
${ordering.pedagogicalFlow}

## Tutorial Contents
${toc}

## Key Insights
${relationships.keyInsights.map((insight) => `- ${insight}`).join("\n")}

---

*Generated by PocketFlowTS AI Tutorial Generator*`;
}
```

**Acceptance Criteria:**
- [ ] Index.md includes project architecture diagram
- [ ] Diagram is properly formatted in Markdown
- [ ] Diagram renders correctly in Jekyll
- [ ] All existing functionality preserved

---

## 🧪 **Phase 4: Testing & Validation (Priority: MEDIUM)**

### **Step 4.1: Create Unit Tests**
**Estimated Time:** 90 minutes
**Files to Create:**
- `src/services/__tests__/diagram-service.test.ts` (NEW)
- `src/services/__tests__/mermaid-validator.test.ts` (NEW)

**Test Coverage Requirements:**
```typescript
describe('DiagramService', () => {
    describe('sanitizeForMermaid', () => {
        // Test all special characters from spec
        // Test multi-line text
        // Test empty/null inputs
        // Test non-English characters
    });
    
    describe('generateProjectArchitectureDiagram', () => {
        // Test with valid abstractions/relationships
        // Test with empty inputs
        // Test with complex relationships
        // Test different diagram configurations
    });
    
    describe('validateDiagram', () => {
        // Test valid diagrams
        // Test invalid syntax
        // Test edge cases
    });
});
```

**Acceptance Criteria:**
- [ ] >90% code coverage for DiagramService
- [ ] All critical functions tested
- [ ] Edge cases handled
- [ ] Performance benchmarks met

### **Step 4.2: Integration Testing**
**Estimated Time:** 60 minutes

**Test Scenarios:**
- [ ] Full pipeline with diagram generation
- [ ] AI service generates valid Mermaid code
- [ ] Jekyll renders diagrams correctly
- [ ] Error handling for invalid diagrams
- [ ] Multi-language diagram generation

---

## 🎨 **Phase 5: Advanced Features (Priority: LOW)**

### **Step 5.1: Enhanced Diagram Types**
**Estimated Time:** 120 minutes

**Additional Diagram Types to Implement:**
- [ ] State diagrams for workflow visualization
- [ ] Entity-relationship diagrams for data models
- [ ] Architecture diagrams for system topology
- [ ] Timeline diagrams for process flows

### **Step 5.2: Advanced Styling**
**Estimated Time:** 60 minutes

**Styling Features:**
- [ ] Theme-based styling
- [ ] Custom color schemes
- [ ] Responsive diagram sizing
- [ ] Dark mode support

### **Step 5.3: Multi-language Enhancement**
**Estimated Time:** 45 minutes

**Language Support:**
- [ ] Spanish diagram text
- [ ] French diagram text  
- [ ] German diagram text
- [ ] Chinese/Japanese character support

---

## 🔍 **Quality Assurance Checklist**

### **Pre-Deployment Verification**

**Functionality Tests:**
- [ ] Project architecture diagrams generate correctly
- [ ] AI-generated chapter diagrams render properly
- [ ] Character sanitization prevents all rendering errors
- [ ] Validation catches syntax errors before rendering
- [ ] Jekyll integration displays diagrams correctly

**Performance Tests:**
- [ ] Diagram generation <500ms for complex diagrams
- [ ] Cache hit rate >80% for repeated requests
- [ ] Memory usage remains stable
- [ ] No memory leaks in long-running processes

**Compatibility Tests:**
- [ ] Works with all supported browsers
- [ ] Mobile-responsive diagram rendering
- [ ] Screen reader accessibility
- [ ] Multi-language character support

**Error Handling Tests:**
- [ ] Graceful handling of invalid diagram syntax
- [ ] Meaningful error messages for users
- [ ] Fallback behavior when diagrams fail
- [ ] Logging for debugging diagram issues

---

## 🚨 **Risk Mitigation**

### **High-Risk Areas & Mitigation**

**1. Character Sanitization Failures**
- **Risk:** Special characters break diagram rendering
- **Mitigation:** Comprehensive test suite + validation
- **Fallback:** Strip problematic characters if sanitization fails

**2. AI-Generated Invalid Syntax**
- **Risk:** AI produces malformed Mermaid code
- **Mitigation:** Validation before rendering + prompt engineering
- **Fallback:** Remove diagram if validation fails, continue with text

**3. Performance Degradation**
- **Risk:** Complex diagrams slow down tutorial generation
- **Mitigation:** Caching + async processing + timeouts
- **Fallback:** Simple text description if diagram generation times out

**4. Jekyll Integration Issues**
- **Risk:** Diagrams don't render in Jekyll output
- **Mitigation:** Test with actual Jekyll build + proper configuration
- **Fallback:** Static image generation as backup

---

## 📊 **Success Metrics**

### **Quantitative Goals**

**Functionality Metrics:**
- **Diagram Generation Success Rate:** >95%
- **Syntax Validation Accuracy:** >99%
- **Cache Performance:** Handled by universal cache system (see PLAN-CACHE.agents.md)
- **Rendering Performance:** <500ms per diagram

**Quality Metrics:**
- **Code Coverage:** >90%
- **Type Safety:** 100% (no `any` types)
- **Error Rate:** <1% of diagram generations
- **User Satisfaction:** Diagrams improve tutorial clarity

### **Qualitative Goals**

**User Experience:**
- [ ] Tutorials are more visually engaging
- [ ] Complex concepts are easier to understand
- [ ] Architecture is clearly visualized
- [ ] Learning path is more intuitive

**Developer Experience:**
- [ ] Code is maintainable and well-documented
- [ ] Adding new diagram types is straightforward
- [ ] Debugging diagram issues is efficient
- [ ] Performance monitoring is comprehensive

---

## 🔄 **Implementation Timeline**

### **Recommended Schedule**

**PREREQUISITE: PLAN-CACHE completion (2 weeks)**
- Universal cache system must be 100% implemented and tested first

**Week 1: Foundation (Phase 1-2)**
- Day 1-2: DiagramService foundation + sanitization (using universal cache)
- Day 3-4: AI integration + schema updates (leveraging cache system)
- Day 5: Testing foundation components

**Week 2: Integration & Advanced Features (Phase 3-5)**
- Day 1-2: Pipeline integration (with cache benefits)
- Day 3-4: Comprehensive testing + advanced features
- Day 5: Final testing + documentation

**Total Timeline: 3 weeks** (2 weeks PLAN-CACHE + 2 weeks PLAN-MERMAID)

### **Critical Path Dependencies**

1. **PLAN-CACHE Implementation** → All Mermaid functionality (BLOCKING DEPENDENCY)
2. **Universal CacheService** → AI Service Integration → Diagram Generation
3. **DiagramService** → AI Integration → Pipeline Integration
4. **Character Sanitization** → All diagram generation
5. **Validation System** → Error handling → User experience
6. **Jekyll Integration** → Final output rendering

---

## 🎯 **Definition of Done**

### **Phase Complete When:**

**Phase 1 Complete:**
- [ ] DiagramService generates valid Mermaid syntax
- [ ] Character sanitization prevents all rendering errors
- [ ] Validation system catches syntax issues
- [ ] All unit tests pass

**Phase 2 Complete:**
- [ ] AI generates diagrams in chapter content
- [ ] Structured outputs include diagram metadata
- [ ] Multi-language support functional
- [ ] Prompt engineering optimized

**Phase 3 Complete:**
- [ ] Pipeline includes project architecture diagram
- [ ] Index.md contains visual architecture overview
- [ ] Streaming updates include diagram progress
- [ ] Error handling is graceful

**Project Complete:**
- [ ] All functionality from original Express version restored
- [ ] New TypeScript/Elysia architecture advantages leveraged
- [ ] Performance exceeds original implementation
- [ ] Documentation complete and accurate
- [ ] Tests provide >90% coverage
- [ ] Jules can successfully implement enhancements

---

## 📚 **Reference Implementation**

### **Original Express Code Location**
- **Primary:** `pocketflow-node/src/core/combine-tutorial.ts:36-54`
- **Secondary:** `pocketflow-node/src/core/write-chapters.ts:162-169`
- **Sanitization:** `pocketflow-node/src/utils/sanitizeForMermaid.js`

### **Target Elysia Integration Points**
- **Service:** `src/services/diagram-service.ts` (NEW)
- **Pipeline:** `src/services/pipeline.ts` (MODIFY)
- **AI Service:** `src/services/ai-service.ts` (MODIFY)
- **Types:** `src/types/tutorial.ts` (MODIFY)

### **Documentation References**
- **CRITICAL DEPENDENCY:** `PLAN-CACHE.agents.md` (must be completed first)
- **Cache Specification:** `CACHE.agents.md` (universal cache system)
- **Complete Spec:** `MERMAID.agents.md`
- **Jekyll Config:** `JEKYLL.agents.md`
- **Development Standards:** `CLAUDE.md`
- **Current Status:** `TODO.agents.md`

---

**Document Version:** 2.0  
**Created:** January 7, 2025  
**Updated:** January 7, 2025 (Universal cache dependency added)  
**Target Completion:** February 11, 2025 (3 weeks after PLAN-CACHE completion)  
**Assigned to:** Implementation Team  
**Reviewed by:** Claude Code Assistant  

**BLOCKING DEPENDENCY:** Complete PLAN-CACHE.agents.md implementation first  
**Next Action:** Verify universal cache system is implemented and tested before proceeding