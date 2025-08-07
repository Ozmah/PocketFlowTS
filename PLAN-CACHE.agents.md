# PLAN-CACHE - Universal Caching System Implementation Roadmap

## 🎯 **Mission Critical Objective**

**Implement universal caching system** for PocketFlowTS to reduce tutorial generation time from ~10 minutes to ~30 seconds, decrease API costs by 70-90%, and provide the foundation for all subsequent feature implementations.

## 📋 **Prerequisites Verification**

Before starting implementation, verify these requirements are met:

- ✅ **CACHE.agents.md** - Complete technical specification (CREATED)
- ✅ **CONTEXT.agents.md** - Problem analysis and requirements (EXISTS)
- ✅ **Current PocketFlowTS architecture** with Elysia + Vercel AI SDK
- ✅ **Working AI Service** with Gemini integration
- ✅ **Bun runtime** with file system access

---

## 🚀 **Phase 1: Core Cache Service (Priority: CRITICAL)**

### **Step 1.1: Create CacheService Foundation**
**Estimated Time:** 60 minutes
**Files to Create:**
- `src/services/cache-service.ts` (NEW)

**Implementation Tasks:**
```typescript
// 1.1.1 - Create singleton CacheService class
export class CacheService {
    private static instance: CacheService;
    private readonly cacheDir: string;
    private readonly cacheFile: string;
    private readonly metadataFile: string;
    private readonly logFile: string;
    private readonly defaultTTL: number = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Core methods to implement:
    generateCacheKey(prompt: string, provider: string, options: CacheOptions): string
    private ensureCacheDir(): Promise<void>
    private loadCache(): Promise<LLMCache>
    private saveCache(cache: LLMCache): Promise<void>
    private logInteraction(): Promise<void>
}
```

**Acceptance Criteria:**
- [ ] CacheService singleton pattern implemented
- [ ] SHA-256 hash generation working
- [ ] Cache directory creation automated
- [ ] JSON file persistence functional
- [ ] TypeScript types properly defined

### **Step 1.2: Implement Core Cache Operations**
**Estimated Time:** 45 minutes

**Implementation:**
```typescript
// 1.2.1 - Implement get/set operations
async get(prompt: string, provider: string, options: CacheOptions): Promise<string | null>
async set(prompt: string, response: string, provider: string, options: CacheOptions): Promise<void>

// 1.2.2 - Implement TTL expiration logic
// Check timestamp vs TTL on every get()
// Auto-cleanup expired entries during load

// 1.2.3 - Implement interaction logging
// Log all cache hits/misses with timestamps
// Include provider and truncated prompt/response
```

**Acceptance Criteria:**
- [ ] Cache get() returns null for misses, string for hits
- [ ] Cache set() stores entries with TTL metadata
- [ ] Expired entries automatically removed on load
- [ ] All interactions logged to `.cache/llm_interactions.log`
- [ ] Concurrent access handled safely

### **Step 1.3: Add Metrics and Management**
**Estimated Time:** 30 minutes

**Implementation:**
```typescript
// 1.3.1 - Implement metrics tracking
private async updateMetrics(hit: boolean): Promise<void>
async getMetrics(): Promise<CacheMetrics>

// 1.3.2 - Implement cache management
async clear(): Promise<void>
async cleanup(): Promise<{ removed: number; remaining: number }>
async getProviderStats(): Promise<Record<string, { entries: number; totalSize: number }>>
```

**Acceptance Criteria:**
- [ ] Hit/miss rates tracked accurately
- [ ] Cache size and provider statistics available
- [ ] Manual cache clearing functional
- [ ] Automatic cleanup removes expired entries
- [ ] Metrics persist across application restarts

---

## 🤖 **Phase 2: AI Service Integration (Priority: CRITICAL)**

### **Step 2.1: Create Cache-Aware AI Methods**
**Estimated Time:** 75 minutes
**Files to Modify:**
- `src/services/ai-service.ts` (MODIFY)

**Implementation Tasks:**
```typescript
// 2.1.1 - Create enhanced generateText method
async generateTextWithCache(
    prompt: string,
    options: CacheOptions & { provider?: string; temperature?: number; maxTokens?: number }
): Promise<{ text: string; usage?: any; cached: boolean }>

// 2.1.2 - Create enhanced generateObject method
async generateObjectWithCache<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options: CacheOptions & { provider?: string; temperature?: number; maxTokens?: number }
): Promise<{ object: T; usage?: any; cached: boolean }>

// 2.1.3 - Handle schema-based caching for structured outputs
// Include schema hash in cache key to ensure type safety
```

**Acceptance Criteria:**
- [ ] generateTextWithCache returns cached responses when available
- [ ] generateObjectWithCache handles structured outputs correctly
- [ ] Schema changes invalidate cache appropriately
- [ ] Cache hits/misses reported in response metadata
- [ ] All existing AI functionality preserved

### **Step 2.2: Update Existing AI Methods**
**Estimated Time:** 60 minutes

**Implementation:**
```typescript
// 2.2.1 - Update identifyAbstractions with caching
async identifyAbstractions(
    files: FetchedFile[],
    maxAbstractions: number = 8,
    language: string = "english",
    options: CacheOptions = {}
): Promise<IdentifyAbstractionsOutput>

// 2.2.2 - Update analyzeRelationships with caching
async analyzeRelationships(
    files: FetchedFile[],
    abstractions: IdentifyAbstractionsOutput["abstractions"],
    language: string = "english",
    options: CacheOptions = {}
): Promise<AnalyzeRelationshipsOutput>

// 2.2.3 - Update writeChapter with caching
async writeChapter(
    abstraction: IdentifyAbstractionsOutput["abstractions"][0],
    files: FetchedFile[],
    relatedAbstractions: string[],
    chapterNumber: number,
    language: string = "english",
    options: CacheOptions = {}
): Promise<WriteChapterOutput>

// 2.2.4 - Update orderChapters with caching
async orderChapters(
    abstractions: IdentifyAbstractionsOutput["abstractions"],
    relationships: AnalyzeRelationshipsOutput["relationships"],
    language: string = "english",
    options: CacheOptions = {}
): Promise<OrderChaptersOutput>
```

**Acceptance Criteria:**
- [ ] All existing AI methods support cache options
- [ ] Cache hits logged with method names and tokens saved
- [ ] Backward compatibility maintained (cache enabled by default)
- [ ] Performance improvements measurable immediately
- [ ] No breaking changes to existing API

---

## 🔄 **Phase 3: Pipeline Integration (Priority: HIGH)**

### **Step 3.1: Integrate Cache into TutorialPipeline**
**Estimated Time:** 45 minutes
**Files to Modify:**
- `src/services/pipeline.ts` (MODIFY)

**Implementation:**
```typescript
// 3.1.1 - Add cache options to TutorialOptions
interface TutorialOptions {
    // ... existing options
    useCache?: boolean;
    cacheTTL?: number;
    cacheProvider?: string;
}

// 3.1.2 - Pass cache options to all AI calls
async* generateTutorial(options: TutorialOptions): AsyncGenerator<StreamingResponse> {
    const cacheOptions: CacheOptions = {
        useCache: options.useCache ?? true,
        ttl: options.cacheTTL || 7 * 24 * 60 * 60 * 1000, // 7 days default
    };

    // Pass cacheOptions to all AI service calls
    const abstractionsResult = await this.aiService.identifyAbstractions(
        files,
        options.maxAbstractions,
        options.language,
        cacheOptions
    );
    
    // ... repeat for all AI calls
}
```

**Acceptance Criteria:**
- [ ] TutorialPipeline accepts cache configuration options
- [ ] All AI calls in pipeline use cache options
- [ ] Streaming responses include cache hit/miss metadata
- [ ] Cache statistics reported in final pipeline result
- [ ] Pipeline performance dramatically improved for repeated requests

### **Step 3.2: Add Cache Metrics to Streaming**
**Estimated Time:** 30 minutes

**Implementation:**
```typescript
// 3.2.1 - Include cache info in streaming responses
yield { 
    type: "step_complete", 
    step: { step: 1, tokens: result.usage?.totalTokens || 0 },
    metadata: { 
        cached: result.cached,
        cacheProvider: 'gemini',
        tokensSaved: result.cached ? (estimatedTokens || 0) : 0
    }
};

// 3.2.2 - Add final cache summary
const metrics = await cacheService.getMetrics();
yield {
    type: "final_result",
    data: {
        success: true,
        tutorialFiles,
        cacheMetrics: {
            hitRate: `${metrics.hitRate.toFixed(2)}%`,
            totalRequests: metrics.totalRequests,
            cacheSize: metrics.cacheSize,
            tokensSaved: totalTokensSaved
        }
    }
};
```

**Acceptance Criteria:**
- [ ] Each pipeline step reports cache hit/miss status
- [ ] Final result includes comprehensive cache statistics
- [ ] Token savings calculated and reported
- [ ] Cache performance visible to users
- [ ] Streaming updates remain responsive

---

## 🌐 **Phase 4: API Integration (Priority: HIGH)**

### **Step 4.1: Add Cache Management Endpoints**
**Estimated Time:** 45 minutes
**Files to Modify:**
- `src/index.ts` (MODIFY)

**Implementation:**
```typescript
// 4.1.1 - Cache status endpoint
app.get("/cache/status", async () => {
    const metrics = await cacheService.getMetrics();
    return {
        success: true,
        metrics: {
            ...metrics,
            hitRateFormatted: `${metrics.hitRate.toFixed(2)}%`,
            lastCleanupFormatted: new Date(metrics.lastCleanup).toISOString(),
        }
    };
});

// 4.1.2 - Cache cleanup endpoint
app.post("/cache/cleanup", async () => {
    const result = await cacheService.cleanup();
    return {
        success: true,
        message: "Cache cleanup completed",
        ...result
    };
});

// 4.1.3 - Clear cache endpoint (admin)
app.delete("/cache/clear", async ({ set }) => {
    await cacheService.clear();
    return {
        success: true,
        message: "Cache cleared successfully"
    };
});

// 4.1.4 - Cache configuration endpoint
app.get("/cache/config", async () => {
    return {
        success: true,
        config: {
            cacheDir: ".cache",
            defaultTTL: "7 days",
            supportedProviders: ["gemini", "claude", "openai"],
            hashAlgorithm: "SHA-256"
        }
    };
});
```

**Acceptance Criteria:**
- [ ] Cache status endpoint returns comprehensive metrics
- [ ] Cache cleanup endpoint removes expired entries
- [ ] Cache clear endpoint empties all cache (admin only)
- [ ] Cache config endpoint shows current settings
- [ ] All endpoints follow existing API patterns

### **Step 4.2: Update Main Tutorial Endpoint**
**Estimated Time:** 30 minutes

**Implementation:**
```typescript
// 4.2.1 - Add cache options to request schema
const tutorialRequestSchema = t.Object({
    // ... existing fields
    useCache: t.Optional(t.Boolean({ default: true })),
    cacheTTL: t.Optional(t.Number({ minimum: 60000, maximum: 30 * 24 * 60 * 60 * 1000 })), // 1 minute to 30 days
});

// 4.2.2 - Pass cache options to pipeline
const result = await this.tutorialPipeline.generateTutorial({
    // ... existing options
    useCache: body.useCache,
    cacheTTL: body.cacheTTL,
});
```

**Acceptance Criteria:**
- [ ] Main tutorial endpoint accepts cache configuration
- [ ] Cache options validated and passed to pipeline
- [ ] Cache performance improvements immediately visible
- [ ] Backward compatibility maintained
- [ ] Error handling for cache failures

---

## 🧪 **Phase 5: Testing & Validation (Priority: MEDIUM)**

### **Step 5.1: Create Core Cache Tests**
**Estimated Time:** 90 minutes
**Files to Create:**
- `src/services/__tests__/cache-service.test.ts` (NEW)

**Test Coverage:**
```typescript
describe('CacheService', () => {
    describe('generateCacheKey', () => {
        // Test consistent SHA-256 hashes
        // Test different hashes for different inputs
        // Test provider and options inclusion
    });
    
    describe('cache operations', () => {
        // Test store and retrieve
        // Test TTL expiration
        // Test cache disabled option
    });
    
    describe('metrics tracking', () => {
        // Test hit/miss counting
        // Test provider statistics
        // Test cache size tracking
    });
    
    describe('cleanup operations', () => {
        // Test expired entry removal
        // Test automatic cleanup
        // Test manual clear
    });
});
```

**Acceptance Criteria:**
- [ ] >90% code coverage for CacheService
- [ ] All critical functions tested
- [ ] Edge cases handled (empty cache, corrupted files, etc.)
- [ ] Performance benchmarks established
- [ ] Concurrent access tested

### **Step 5.2: Create Integration Tests**
**Estimated Time:** 60 minutes
**Files to Create:**
- `src/services/__tests__/ai-service-cache.test.ts` (NEW)

**Test Coverage:**
```typescript
describe('AI Service Cache Integration', () => {
    describe('generateTextWithCache', () => {
        // Test cache miss -> API call -> cache storage
        // Test cache hit -> no API call
        // Test cache disabled -> always API call
    });
    
    describe('generateObjectWithCache', () => {
        // Test structured output caching
        // Test schema changes invalidate cache
        // Test JSON parsing of cached objects
    });
    
    describe('pipeline integration', () => {
        // Test full tutorial generation with cache
        // Test cache metrics in streaming responses
        // Test performance improvements
    });
});
```

**Acceptance Criteria:**
- [ ] Integration tests cover all AI methods
- [ ] Pipeline cache integration tested
- [ ] Performance improvements verified
- [ ] Cache hit rates measured
- [ ] Error scenarios handled

### **Step 5.3: Performance Benchmarking**
**Estimated Time:** 45 minutes

**Benchmark Tests:**
```typescript
describe('Cache Performance', () => {
    it('should improve response time by >80% on cache hits', async () => {
        // Measure first call (cache miss)
        // Measure second call (cache hit)
        // Verify >80% improvement
    });
    
    it('should achieve >80% cache hit rate after warmup', async () => {
        // Run multiple similar requests
        // Measure cache hit rate
        // Verify >80% hits
    });
    
    it('should handle 100 concurrent requests without degradation', async () => {
        // Test concurrent cache access
        // Verify no data corruption
        // Measure performance impact
    });
});
```

**Acceptance Criteria:**
- [ ] Cache hits >80% faster than fresh API calls
- [ ] Cache hit rate >80% for similar requests
- [ ] Concurrent access performs well
- [ ] Memory usage remains stable
- [ ] No cache corruption under load

---

## 🔍 **Quality Assurance Checklist**

### **Pre-Deployment Verification**

**Functionality Tests:**
- [ ] Cache stores and retrieves responses correctly
- [ ] TTL expiration works as expected
- [ ] Cache disabled option bypasses cache
- [ ] Multiple providers supported (gemini, claude, openai)
- [ ] Structured outputs cached correctly

**Performance Tests:**
- [ ] Tutorial generation <30 seconds for cached content
- [ ] Cache hit rate >80% after initial warmup
- [ ] Memory usage stable under load
- [ ] No memory leaks in long-running processes
- [ ] Concurrent access performs well

**Integration Tests:**
- [ ] AI Service integration seamless
- [ ] Pipeline integration functional
- [ ] API endpoints respond correctly
- [ ] Streaming updates include cache metrics
- [ ] Error handling graceful

**Data Integrity Tests:**
- [ ] Cache files not corrupted
- [ ] Metrics accurately tracked
- [ ] Logs properly formatted
- [ ] Cleanup removes only expired entries
- [ ] Clear operation removes all entries

---

## 🚨 **Risk Mitigation**

### **High-Risk Areas & Mitigation**

**1. Cache Corruption**
- **Risk:** Concurrent access corrupts cache files
- **Mitigation:** File locking, atomic writes, validation on load
- **Fallback:** Rebuild cache from scratch if corrupted

**2. Disk Space Issues**
- **Risk:** Cache grows too large and fills disk
- **Mitigation:** Automatic cleanup, size limits, monitoring
- **Fallback:** Emergency cache clear if disk space low

**3. Performance Degradation**
- **Risk:** Cache operations slow down responses
- **Mitigation:** Async operations, efficient JSON parsing, benchmarking
- **Fallback:** Disable cache if operations take >100ms

**4. Cache Key Collisions**
- **Risk:** Different prompts generate same cache key
- **Mitigation:** Include all relevant parameters in hash, use SHA-256
- **Fallback:** Add timestamp to cache key if collision detected

---

## 📊 **Success Metrics**

### **Quantitative Goals**

**Performance Metrics:**
- **Tutorial Generation Time:** <30 seconds (from ~10 minutes)
- **Cache Hit Rate:** >80% after warmup period
- **API Cost Reduction:** 70-90% reduction in LLM calls
- **Response Time:** <2 seconds for cache hits

**Quality Metrics:**
- **Code Coverage:** >90% for cache-related code
- **Uptime:** 99.9% cache availability
- **Data Integrity:** 0% cache corruption incidents
- **Memory Usage:** <100MB cache size for typical usage

### **Qualitative Goals**

**Developer Experience:**
- [ ] Cache integration transparent to existing code
- [ ] Easy to disable/enable cache for debugging
- [ ] Clear metrics and monitoring available
- [ ] Simple cache management operations

**User Experience:**
- [ ] Dramatically faster tutorial generation
- [ ] Consistent performance across requests
- [ ] Visible cache statistics in responses
- [ ] Graceful fallback when cache unavailable

---

## 🔄 **Implementation Timeline**

### **Recommended Schedule**

**Week 1: Foundation (Phase 1-2)**
- Day 1-2: Core CacheService implementation
- Day 3-4: AI Service integration
- Day 5: Testing and debugging

**Week 2: Integration (Phase 3-4)**
- Day 1-2: Pipeline integration
- Day 3-4: API endpoints and management
- Day 5: Integration testing

**Week 3: Validation (Phase 5)**
- Day 1-2: Comprehensive testing
- Day 3-4: Performance benchmarking
- Day 5: Documentation and deployment prep

### **Critical Path Dependencies**

1. **CacheService Core** → AI Service Integration → Pipeline Integration
2. **Cache Operations** → Metrics Tracking → Management Endpoints
3. **Basic Functionality** → Performance Testing → Production Deployment

---

## 🎯 **Definition of Done**

### **Phase Complete When:**

**Phase 1 Complete:**
- [ ] CacheService generates consistent SHA-256 hashes
- [ ] Cache stores and retrieves entries correctly
- [ ] TTL expiration removes old entries automatically
- [ ] Metrics track hits/misses accurately

**Phase 2 Complete:**
- [ ] AI Service methods support cache options
- [ ] Cache hits avoid API calls completely
- [ ] Structured outputs cached correctly
- [ ] Performance improvements measurable

**Phase 3 Complete:**
- [ ] Pipeline passes cache options to all AI calls
- [ ] Streaming responses include cache metrics
- [ ] Tutorial generation dramatically faster for cached content
- [ ] Cache statistics visible to users

**Project Complete:**
- [ ] Tutorial generation time reduced from ~10 minutes to ~30 seconds
- [ ] Cache hit rate >80% for similar requests
- [ ] API costs reduced by 70-90%
- [ ] All tests pass with >90% coverage
- [ ] Cache management endpoints functional
- [ ] Documentation complete and accurate

---

## 📚 **Reference Implementation**

### **Original Express Cache System**
- **Primary:** `/mnt/d/trabajo/personales/pocketflow-node/src/utils/llm.ts`
- **Tests:** `/mnt/d/trabajo/personales/pocketflow-node/tests/utils/llm.test.ts`
- **Documentation:** `/mnt/d/trabajo/personales/pocketflow-node/CLAUDE.md`

### **Target Elysia Integration Points**
- **Service:** `src/services/cache-service.ts` (NEW)
- **AI Integration:** `src/services/ai-service.ts` (MODIFY)
- **Pipeline:** `src/services/pipeline.ts` (MODIFY)
- **API:** `src/index.ts` (MODIFY)

### **Documentation References**
- **Complete Spec:** `CACHE.agents.md`
- **Context Analysis:** `CONTEXT.agents.md`
- **Development Standards:** `CLAUDE.md`
- **Current Status:** `TODO.agents.md`

---

**Document Version:** 1.0  
**Created:** January 7, 2025  
**Target Completion:** January 21, 2025 (2 weeks)  
**Assigned to:** Implementation Team  
**Reviewed by:** Claude Code Assistant  

**Next Action:** Begin Phase 1, Step 1.1 - Create CacheService Foundation